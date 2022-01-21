import { NamedNode, Term } from 'rdf-js'
import clownface, { AnyPointer, GraphPointer } from 'clownface'
import { fromPointer, IriTemplate } from '@rdfine/hydra/lib/IriTemplate'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import $rdf from 'rdf-ext'
import StreamClient from 'sparql-http-client/StreamClient'
import { ResourceIdentifier } from '@tpluscode/rdfine'
import { HydraBox } from 'hydra-box'
import DatasetExt from 'rdf-ext/lib/Dataset'
import { hyper_query } from '@hydrofoil/vocabularies/builders'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { getSparqlQuery, memberData } from './query/collection'
import { loadLinkedResources } from './query/eagerLinks'

const emptyDataset = clownface({ dataset: $rdf.dataset() })

interface AddCollectionViewsParams {
  collection: GraphPointer
  total: number
  template: IriTemplate
  query?: AnyPointer
  pageSize: number
}

function templateParamsForPage(query: AnyPointer, page: number) {
  const clone = clownface({ dataset: $rdf.dataset([...query.dataset]) })
    .in().toArray()[0]

  if (!clone) {
    return clownface({ dataset: $rdf.dataset() }).blankNode().addOut(hydra.pageIndex, page)
  }

  return clone.deleteOut(hydra.pageIndex).addOut(hydra.pageIndex, page)
}

function addCollectionViews({ collection, total, template, query = emptyDataset, pageSize }: AddCollectionViewsParams): void {
  if (!template.mapping.some(m => m.property?.equals(hydra.pageIndex))) {
    return
  }

  const pageIndex = Number.parseInt(query.out(hydra.pageIndex).value || '1')
  const viewId = $rdf.namedNode(template.expand(templateParamsForPage(query, pageIndex)))
  collection
    .addOut(hydra.view, viewId, view => {
      const totalPages = Math.ceil(total / pageSize)

      view.addOut(rdf.type, hydra.PartialCollectionView)
      view.addOut(hydra.first, $rdf.namedNode(template.expand(templateParamsForPage(query, 1))))
      view.addOut(hydra.last, $rdf.namedNode(template.expand(templateParamsForPage(query, totalPages))))
      if (pageIndex > 1) {
        view.addOut(hydra.previous, $rdf.namedNode(template.expand(templateParamsForPage(query, pageIndex - 1))))
      }
      if (pageIndex < totalPages) {
        view.addOut(hydra.next, $rdf.namedNode(template.expand(templateParamsForPage(query, pageIndex + 1))))
      }
    })
}

function addTemplateMappings(collection: GraphPointer, template: IriTemplate, request: AnyPointer = emptyDataset): void {
  collection.addOut(hyper_query.templateMappings, currMappings => {
    template.mapping.forEach(mapping => {
      if (mapping.property) {
        const property = mapping.property.id
        currMappings.addOut(property, request.out(property))
      }
    })
  })
}

function isGraphPointer(pointer: AnyPointer): pointer is GraphPointer<ResourceIdentifier> {
  return pointer.term?.termType === 'NamedNode' || pointer.term?.termType === 'BlankNode'
}

export async function loadSearch(resource: GraphPointer, client: StreamClient): Promise<GraphPointer<ResourceIdentifier> | null> {
  const search = resource.out(hydra.search)
  if (isGraphPointer(search)) {
    if (search.term.termType === 'NamedNode') {
      const dataset = await $rdf.dataset().import(await DESCRIBE`${search.term}`.execute(client.query))

      return clownface({ dataset }).node(search.term)
    }

    return search
  }

  return null
}

async function getTemplate(resource: GraphPointer, client: StreamClient): Promise<IriTemplate | null> {
  const templateVariables = await loadSearch(resource, client)
  if (templateVariables) {
    return fromPointer(templateVariables)
  }

  return null
}

interface CollectionParams {
  collection: GraphPointer<NamedNode>
  query?: AnyPointer
  pageSize: number
  hydraBox: HydraBox
  sparqlClient: StreamClient
}

function assertApiTerm(api: AnyPointer): asserts api is GraphPointer<NamedNode> {
  if (api.term?.termType !== 'NamedNode') {
    throw new Error('ApiDocumentation was not initialised')
  }
}

async function loadDynamicCollection(
  collection: GraphPointer<NamedNode, DatasetExt>,
  template: IriTemplate | null,
  { hydraBox, sparqlClient, pageSize, query }: Pick<CollectionParams, 'hydraBox' | 'sparqlClient' | 'pageSize' | 'query'>) {
  const pageQuery = await getSparqlQuery({
    api: hydraBox.api,
    collection,
    query,
    variables: template,
    pageSize,
  })

  let total = 0
  let members: NamedNode[] = []
  if (pageQuery) {
    const getMembers = pageQuery.members(sparqlClient).then(result => {
      members = result
    })

    const getTotal = pageQuery.totals(sparqlClient)
      .then(result => {
        total = result
      })

    const getData = pageQuery.memberData(sparqlClient)
      .then(async stream => {
        await collection.dataset.import(stream)
      })

    await Promise.all([getMembers, getTotal, getData])
  }

  return { total, members }
}

export async function collection({ hydraBox, pageSize, sparqlClient, query, ...rest }: CollectionParams): Promise<GraphPointer<NamedNode, DatasetExt>> {
  const api = clownface(hydraBox.api)
  assertApiTerm(api)

  const collection = clownface({
    dataset: $rdf.dataset([...rest.collection.dataset]),
    term: rest.collection.term,
  })
  const template = await getTemplate(await hydraBox.resource.clownface(), sparqlClient)

  let total: number
  let members: Term[]
  if (collection.has(hydra.member).terms.length) {
    members = collection.out(hydra.member).terms
    total = members.length
    await collection.dataset.import(await memberData(members, sparqlClient))
    const eagerLoadByCollection = api.node([hydraBox.operation.term, ...hydraBox.resource.types]).out(hyper_query.memberInclude)
    const eagerLoadByMembers = api.node(collection.out(hydra.member).out(rdf.type).terms).out(hyper_query.include)

    const included = await Promise.all([
      loadLinkedResources(collection.out(hydra.member), eagerLoadByCollection, sparqlClient),
      loadLinkedResources(collection.out(hydra.member), eagerLoadByMembers, sparqlClient),
    ])

    included.forEach(collection.dataset.addAll)
  } else {
    ({ total, members } = await loadDynamicCollection(collection, template, {
      hydraBox,
      pageSize,
      query,
      sparqlClient,
    }))

    collection.namedNode(collection.term).addOut(hydra.member, members)
    const includeLinked = api.node(collection.out(hydra.member).out(rdf.type).terms).out(hyper_query.include)
    collection.dataset.addAll(await loadLinkedResources(collection.out(hydra.member), includeLinked, sparqlClient))
  }

  collection.deleteOut(hydra.totalItems).addOut(hydra.totalItems, total)

  if (template) {
    addTemplateMappings(collection, template, query)
    addCollectionViews({
      collection,
      total,
      template,
      query,
      pageSize,
    })
  }

  return collection
}

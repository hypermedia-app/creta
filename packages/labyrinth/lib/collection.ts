import { NamedNode } from 'rdf-js'
import clownface, { AnyPointer, GraphPointer, MultiPointer } from 'clownface'
import { fromPointer, IriTemplate } from '@rdfine/hydra/lib/IriTemplate'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import $rdf from 'rdf-ext'
import StreamClient from 'sparql-http-client/StreamClient'
import { ResourceIdentifier } from '@tpluscode/rdfine'
import { HydraBox } from 'hydra-box'
import DatasetExt from 'rdf-ext/lib/Dataset'
import * as ns from '@hydrofoil/namespaces'
import { getSparqlQuery } from './query/collection'
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

  if (page === 1) {
    return clone.deleteOut(hydra.pageIndex)
  }

  return clone.deleteOut(hydra.pageIndex).addOut(hydra.pageIndex, page)
}

function addCollectionViews({ collection, total, template, query = emptyDataset, pageSize }: AddCollectionViewsParams): void {
  if (!template.mapping.some(m => m.property?.equals(hydra.pageIndex))) {
    return
  }

  collection
    .addOut(hydra.view, view => {
      const pageIndex = Number.parseInt(query.out(hydra.pageIndex).value || '1')
      const totalPages = Math.floor(total / pageSize) + 1

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
  collection.addOut(ns.query.templateMappings, currMappings => {
    template.mapping.forEach(mapping => {
      if (mapping.property) {
        const property = mapping.property.id
        currMappings.addOut(property, request.out(property))
      }
    })
  })
}

function getTemplate(hydra: HydraBox): IriTemplate | null {
  const templateVariables = hydra.operation.out(ns.hydraBox.variables) as MultiPointer<ResourceIdentifier>
  if (templateVariables.term) {
    return fromPointer(templateVariables.toArray()[0])
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

export async function collection({ hydraBox, pageSize, sparqlClient, query, ...rest }: CollectionParams): Promise<GraphPointer<NamedNode, DatasetExt>> {
  const api = clownface(hydraBox.api)
  assertApiTerm(api)

  const collection = clownface({
    dataset: $rdf.dataset([...rest.collection.dataset]),
    term: rest.collection.term,
  })
  const template = getTemplate(hydraBox)

  const pageQuery = await getSparqlQuery({
    api: hydraBox.api,
    collection,
    query,
    variables: template,
    pageSize,
  })

  let total = 0
  if (pageQuery) {
    const page = await pageQuery.members.execute(sparqlClient.query)
    const totals = pageQuery.totals.execute(sparqlClient.query)
    for await (const result of await totals) {
      total = Number.parseInt(result.count.value)
    }
    await collection.dataset.import(page)
  }
  collection.addOut(hydra.totalItems, total)

  const memberAssertions = collection.any()
    .has(rdf.type, collection.out(hydra.manages).has(hydra.property, rdf.type).out(hydra.object))
  collection.namedNode(collection.term)
    .addOut(hydra.member, memberAssertions)

  const eagerLoadByCollection = api.node([hydraBox.operation.term, ...hydraBox.resource.types]).out(ns.query.include)
  const eagerLoadByMembers = api.node(collection.out(hydra.member).out(rdf.type).terms).out(ns.query.include)
  const includeLinked = [...eagerLoadByCollection.toArray(), ...eagerLoadByMembers.toArray()]
  collection.dataset.addAll(await loadLinkedResources(collection.out(hydra.member), includeLinked, sparqlClient))

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

import { BlankNode, NamedNode, Stream, Term } from 'rdf-js'
import { Request } from 'express'
import clownface, { AnyPointer, GraphPointer } from 'clownface'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import $rdf from 'rdf-ext'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { ResourceIdentifier } from '@tpluscode/rdfine'
import { IriTemplate } from '@rdfine/hydra'
import { fromPointer } from '@rdfine/hydra/lib/IriTemplate'
import TermSet from '@rdfjs/term-set'
import DatasetExt from 'rdf-ext/lib/Dataset'
import { hyper_query } from '@hydrofoil/vocabularies/builders'
import { toPointer } from './template'
import { log } from './logger'
import { isGraphPointer } from './clownface'
import staticCollection from './query/staticCollection'
import dynamicCollection from './query/dynamicCollection'

interface CollectionLoaded {
  collection: GraphPointer<NamedNode, DatasetExt>
  search: GraphPointer<ResourceIdentifier> | undefined
  searchTemplate: IriTemplate | null
  queryParams: GraphPointer
  pageSize: number
}

interface QueriesInitialized {
  queries: {
    members(): Promise<Term[]> | Term[]
    total(): Promise<number> | number
    memberData(members: NamedNode[]): Promise<Stream>
  }
}

interface MembersLoaded {
  total: number
  members: Array<Term>
  memberData: Stream
}

export type CollectionLocals = CollectionLoaded & QueriesInitialized & MembersLoaded

export const loadCollection = async (
  req: Pick<Request, 'hydra' | 'labyrinth' | 'query'>,
): Promise<CollectionLoaded> => {
  const collection = await req.hydra.resource.clownface()
  const searchPtr = collection.out(hydra.search)
  const types = clownface(req.hydra.api).node([...req.hydra.resource.types])

  let search: GraphPointer<NamedNode | BlankNode> | undefined
  let queryParams = clownface({ dataset: $rdf.dataset() }).blankNode()
  let searchTemplate: IriTemplate | null = null

  if (isGraphPointer(searchPtr)) {
    search = searchPtr

    if (search.term.termType === 'NamedNode') {
      const dataset = await $rdf.dataset().import(await DESCRIBE`${search.term}`.execute(req.labyrinth.sparql.query))
      search = clownface({ dataset }).node(search.term)
    }
  }

  if (search) {
    queryParams = toPointer(search, req.query)
    searchTemplate = fromPointer(search)
    log('Search params %s', queryParams.dataset.toString())

    collection.addOut(hyper_query.templateMappings, currMappings => {
      searchTemplate?.mapping.forEach(mapping => {
        if (mapping.property) {
          const property = mapping.property.id
          currMappings.addOut(property, queryParams.out(property))
        }
      })
    })
  }

  const hydraLimit = queryParams?.out(hydra.limit).value || collection.out(hydra.limit).value || types.out(hydra.limit).value
  const pageSize = hydraLimit ? parseInt(hydraLimit) : req.labyrinth.collection.pageSize

  return {
    collection,
    search,
    searchTemplate,
    queryParams,
    pageSize,
  }
}

export const initQueries = async (
  locals: CollectionLoaded,
  req: Pick<Request, 'hydra' | 'labyrinth'>,
): Promise<QueriesInitialized> => {
  const {
    collection,
    searchTemplate,
    queryParams,
    pageSize,
  } = locals

  let queries: CollectionLocals['queries']
  if (collection.has(hydra.member).terms.length) {
    queries = staticCollection(req, collection)
  } else {
    queries = await dynamicCollection({
      api: req.hydra.api,
      collection,
      pageSize,
      variables: searchTemplate,
      query: queryParams,
      client: req.labyrinth.sparql,
    })
  }

  return {
    queries,
  }
}

function isNamedNode(arg: Term): arg is NamedNode {
  return arg.termType === 'NamedNode'
}

export const runQueries = async (locals: QueriesInitialized): Promise<MembersLoaded> => {
  const members = [...new TermSet(await locals.queries.members())]
  const [memberData, total] = await Promise.all([
    locals.queries.memberData(members.filter(isNamedNode)),
    locals.queries.total(),
  ])

  return {
    total,
    members,
    memberData,
  }
}

function templateParamsForPage(query: AnyPointer, page: number) {
  const clone = clownface({ dataset: $rdf.dataset([...query.dataset]) })
    .in().toArray()[0]

  if (!clone) {
    return clownface({ dataset: $rdf.dataset() }).blankNode().addOut(hydra.pageIndex, page)
  }

  return clone.deleteOut(hydra.pageIndex).addOut(hydra.pageIndex, page)
}

export const createViews = (locals: Pick<CollectionLoaded & MembersLoaded, 'searchTemplate' | 'queryParams' | 'total' | 'pageSize'>): GraphPointer | null => {
  const template = locals.searchTemplate
  const query = locals.queryParams
  const total = locals.total
  const pageSize = locals.pageSize

  if (!template?.mapping.some(m => m.property?.equals(hydra.pageIndex))) {
    return null
  }

  const pageIndex = Number.parseInt(query.out(hydra.pageIndex).value || '1')

  const view = clownface({ dataset: $rdf.dataset() })
    .namedNode(template.expand(templateParamsForPage(query, pageIndex)))

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

  return view
}

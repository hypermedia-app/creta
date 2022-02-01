import { NamedNode, Stream, Term } from 'rdf-js'
import { Response } from 'express'
import clownface, { AnyPointer, GraphPointer } from 'clownface'
import asyncMiddleware from 'middleware-async'
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
import dynamicCollection from './query/collection'

export type CollectionResponse = Response<any, {
  collection?: GraphPointer<NamedNode, DatasetExt>
  search?: GraphPointer<ResourceIdentifier>
  searchTemplate?: IriTemplate
  total?: number
  pageSize?: number
  queryParams?: AnyPointer
  queries?: {
    members(): Promise<Term[]>
    totals(): Promise<number>
    memberData(members: NamedNode[]): Promise<Stream>
  }
  members?: TermSet<NamedNode>
}>

export const loadCollection = asyncMiddleware(async (req, res: CollectionResponse, next) => {
  res.locals.collection = await req.hydra.resource.clownface()
  next()
})

export const loadSearch = asyncMiddleware(async (req, res: CollectionResponse, next) => {
  const { collection } = res.locals
  const search = collection?.out(hydra.search)
  if (isGraphPointer(search)) {
    res.locals.search = search

    if (search.term.termType === 'NamedNode') {
      const dataset = await $rdf.dataset().import(await DESCRIBE`${search.term}`.execute(req.labyrinth.sparql.query))
      res.locals.search = clownface({ dataset }).node(search.term)
    }
  }

  if (res.locals.search) {
    const query = toPointer(res.locals.search, req.query)
    const template = fromPointer(res.locals.search)
    log('Search params %s', query.dataset.toString())
    res.locals.queryParams = query
    res.locals.searchTemplate = template

    collection?.addOut(hyper_query.templateMappings, currMappings => {
      template.mapping.forEach(mapping => {
        if (mapping.property) {
          const property = mapping.property.id
          currMappings.addOut(property, query.out(property))
        }
      })
    })
  }

  return next()
})

export const initSettings = asyncMiddleware(async (req, res: CollectionResponse, next) => {
  const types = clownface(req.hydra.api).node([...req.hydra.resource.types])
  const collection = res.locals.collection!
  const searchTemplate = res.locals.searchTemplate!
  const queryParams = res.locals.queryParams!

  const hydraLimit = queryParams?.out(hydra.limit).value || collection?.out(hydra.limit).value || types.out(hydra.limit).value
  const pageSize = hydraLimit ? parseInt(hydraLimit) : req.labyrinth.collection.pageSize

  res.locals.pageSize = pageSize

  if (collection?.has(hydra.member).terms.length) {
    res.locals.queries = staticCollection(req, collection)
  } else {
    res.locals.queries = await dynamicCollection({
      api: req.hydra.api,
      collection,
      pageSize,
      variables: searchTemplate,
      query: queryParams,
      client: req.labyrinth.sparql,
    })
  }

  next()
})

function isNamedNode(arg: Term): arg is NamedNode {
  return arg.termType === 'NamedNode'
}

export const runQueries = asyncMiddleware(async (req, res: CollectionResponse, next) => {
  const { collection } = res.locals

  const members = await res.locals.queries!.members()
  const memberData = await res.locals.queries!.memberData(members.filter(isNamedNode))
  const total = await res.locals.queries!.totals()

  await collection?.dataset.import(memberData)
  collection?.deleteOut(hydra.totalItems).addOut(hydra.totalItems, total)

  res.locals.total = total

  next()
})

function templateParamsForPage(query: AnyPointer, page: number) {
  const clone = clownface({ dataset: $rdf.dataset([...query.dataset]) })
    .in().toArray()[0]

  if (!clone) {
    return clownface({ dataset: $rdf.dataset() }).blankNode().addOut(hydra.pageIndex, page)
  }

  return clone.deleteOut(hydra.pageIndex).addOut(hydra.pageIndex, page)
}

export const populatePartialViews = asyncMiddleware((req, res: CollectionResponse, next) => {
  const template = res.locals.searchTemplate
  const query = res.locals.queryParams
  const collection = res.locals.collection
  const total = res.locals.total!
  const pageSize = res.locals.pageSize!

  if (!template || !collection || !query) {
    return next()
  }

  if (!template?.mapping.some(m => m.property?.equals(hydra.pageIndex))) {
    return next()
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

  return next()
})

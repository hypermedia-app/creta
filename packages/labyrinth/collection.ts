import { RequestHandler, Router, Response } from 'express'
import clownface from 'clownface'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import asyncMiddleware from 'middleware-async'
import { hydra } from '@tpluscode/rdf-ns-builders'
import { preprocessMiddleware, returnMinimal } from './lib/middleware'
import * as lib from './lib/collection'

export type CollectionResponse = Response<any, Partial<lib.CollectionLocals>>

function assertLocals<T extends keyof lib.CollectionLocals>(locals: Partial<lib.CollectionLocals>, ...keys: T[]): asserts locals is Pick<lib.CollectionLocals, T> & Partial<lib.CollectionLocals> {
  const missingKeys = keys.filter(key => !(key in locals))
  if (missingKeys.length) {
    throw new Error(`Missing values for ${missingKeys.join(', ')} in response locals`)
  }
}

const sendResponse: RequestHandler = (req, res) => {
  const { dataset } = res.locals.collection
  res.setLink(req.hydra.resource.term.value, 'canonical')
  return res.dataset(dataset)
}

export function createGetHandler({
  loadCollection = lib.loadCollection,
  initQueries = lib.initQueries,
  runQueries = lib.runQueries,
  createViews = lib.createViews,
}: Partial<typeof lib> = {}): RequestHandler {
  return Router()
    .use(returnMinimal)
    .use(asyncMiddleware(async (req, res: CollectionResponse, next) => {
      res.locals = await loadCollection(req)
      next()
    }))
    .use(asyncMiddleware(async (req, res: CollectionResponse, next) => {
      assertLocals(res.locals, 'collection', 'queryParams', 'pageSize', 'search', 'searchTemplate')

      res.locals = {
        ...res.locals,
        ...await initQueries(res.locals, req),
      }
      next()
    }))
    .use(asyncMiddleware(async (req, res: CollectionResponse, next) => {
      assertLocals(res.locals, 'collection', 'queries')

      const {
        members, total, memberData,
      } = await runQueries(res.locals)

      res.locals.total = total

      await res.locals.collection.dataset.import(memberData)
      res.locals.collection.addOut(hydra.member, [...members.values()])
      res.locals.collection.deleteOut(hydra.totalItems).addOut(hydra.totalItems, total)

      next()
    }))
    .use((req, res: CollectionResponse, next) => {
      assertLocals(res.locals, 'collection', 'searchTemplate', 'queryParams', 'pageSize', 'total')

      const views = createViews(res.locals)

      if (views) {
        res.locals.collection.addOut(hydra.view, [...views.terms])
        res.locals.collection.dataset.addAll([...views.dataset])
      }
      next()
    })
    .use(preprocessMiddleware({
      async getResource(req, res: CollectionResponse) {
        const { dataset } = res.locals.collection!
        return clownface({ dataset, term: req.hydra.resource.term })
      },
      predicate: knossos.preprocessResponse,
    }))
    .use(sendResponse)
}

export const get = createGetHandler()

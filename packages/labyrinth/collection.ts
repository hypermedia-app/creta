import { RequestHandler, Router, Response } from 'express'
import clownface from 'clownface'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import asyncMiddleware from 'middleware-async'
import { hydra } from '@tpluscode/rdf-ns-builders'
import { preprocessMiddleware } from './lib/middleware/preprocessResource'
import * as lib from './lib/collection'

export type CollectionResponse = Response<any, Partial<lib.CollectionLocals>>

function assertLocals<T extends keyof lib.CollectionLocals>(locals: Partial<lib.CollectionLocals>, ...keys: T[]): locals is Pick<lib.CollectionLocals, T> {
  return keys.every(key => key in locals)
}

const sendResponse: RequestHandler = (req, res) => {
  const { dataset } = res.locals.collection
  res.setLink(req.hydra.resource.term.value, 'canonical')
  return res.dataset(dataset)
}

export const get = Router()
  .use(asyncMiddleware(async (req, res: CollectionResponse, next) => {
    res.locals = await lib.loadCollection(req)
    next()
  }))
  .use(asyncMiddleware(async (req, res: CollectionResponse, next) => {
    if (!assertLocals(res.locals, 'collection', 'queryParams', 'pageSize', 'search', 'searchTemplate')) {
      return next(new Error('Collection not loaded'))
    }

    res.locals = {
      ...res.locals,
      ...await lib.initQueries(res.locals, req),
    }
    next()
  }))
  .use(asyncMiddleware(async (req, res: CollectionResponse, next) => {
    if (!assertLocals(res.locals, 'collection', 'queries')) {
      return next(new Error('Collection not loaded'))
    }

    const {
      members, total, memberData,
    } = await lib.runQueries(res.locals)

    await res.locals.collection.dataset.import(memberData)
    res.locals.collection.addOut(hydra.member, [...members.values()])
    res.locals.collection.deleteOut(hydra.totalItems).addOut(hydra.totalItems, total)

    next()
  }))
  .use((req, res: CollectionResponse, next) => {
    if (!assertLocals(res.locals, 'collection', 'searchTemplate', 'queryParams', 'pageSize', 'total')) {
      return next(new Error('Collection not loaded'))
    }

    const views = lib.createViews(res.locals)

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

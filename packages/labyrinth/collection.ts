import { RequestHandler, Router } from 'express'
import clownface from 'clownface'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import { preprocessMiddleware } from './lib/middleware/preprocessResource'
import * as lib from './lib/collection'
import { CollectionResponse } from './lib/collection'

const sendResponse: RequestHandler = (req, res) => {
  const { dataset } = res.locals.collection
  res.setLink(req.hydra.resource.term.value, 'canonical')
  return res.dataset(dataset)
}

export const get = Router()
  .use(lib.loadCollection)
  .use(lib.loadSearch)
  .use(lib.initSettings)
  .use(lib.runQueries)
  .use(lib.populatePartialViews)
  .use(preprocessMiddleware({
    async getResource(req, res: CollectionResponse) {
      const { dataset } = res.locals.collection!
      return clownface({ dataset, term: req.hydra.resource.term })
    },
    predicate: knossos.preprocessResponse,
  }))
  .use(sendResponse)

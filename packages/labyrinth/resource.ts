/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth/resource
 */

import { Router } from 'express'
import asyncMiddleware from 'middleware-async'
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import { hyper_query } from '@hydrofoil/vocabularies/builders'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import { preprocessResource } from './lib/middleware/preprocessResource'
import { loadResourceWithLinks } from './lib/query/eagerLinks'
import { returnMinimal } from './lib/middleware'

export type { ResourceHook } from './lib/middleware/preprocessResource'

/**
 * Generic middleware for handling `GET` requests
 */
export const get = Router()
  .use(returnMinimal)
  .use(asyncMiddleware(async (req, res) => {
    const types = clownface({
      dataset: req.hydra.api.dataset,
      term: [...req.hydra.resource.types],
    })

    const dataset = await $rdf.dataset()
      .import(await loadResourceWithLinks([req.hydra.resource.term], types.out(hyper_query.include).toArray(), req.labyrinth.sparql))

    const pointer = clownface({ dataset, term: req.hydra.resource.term })

    await preprocessResource({
      req,
      res,
      getResource: async () => pointer,
      predicate: knossos.preprocessResponse,
    })

    return res.dataset(dataset)
  }))

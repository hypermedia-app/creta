/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth/resource
 */

import { Router } from 'express'
import asyncMiddleware from 'middleware-async'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import { preprocessResource } from './lib/middleware/preprocessResource'
import { returnMinimal } from './lib/middleware'
import { loadRepresentation } from './lib/resource'

export type { ResourceHook } from './lib/middleware/preprocessResource'

/**
 * Generic middleware for handling `GET` requests
 */
export const get = Router()
  .use(returnMinimal)
  .use(asyncMiddleware(async (req, res) => {
    const pointer = await loadRepresentation(req)

    await preprocessResource({
      req,
      res,
      getResource: async () => pointer,
      predicate: knossos.preprocessResponse,
    })

    return res.dataset(pointer.dataset)
  }))

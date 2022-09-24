/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth/lib/middleware/sendResponse
 */

import { DatasetCore } from 'rdf-js'
import { Response, RequestHandler, Request } from 'express'
import asyncMiddleware from 'middleware-async'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import { loadImplementations } from '../code'

export interface BeforeSendParams {
  req: Request
  res: Response
  dataset: DatasetCore
}

/**
 * Runs just before the response triples are sent. The best moment to set final headers, such as cache-control
 */
export interface BeforeSend<Args extends unknown[] = []> {
  (arg: BeforeSendParams, ...args: Args): void | Promise<void>
}

export const sendResponse = (dataset: DatasetCore): RequestHandler => asyncMiddleware(async (req, res) => {
  const hookPointers = req.hydra.operation.out(knossos.beforeSend)
  const beforeSaveHooks = await loadImplementations<BeforeSend<unknown[]>>(hookPointers, req)

  await Promise.all(beforeSaveHooks.map(([hook, args]) => {
    req.knossos.log(`Running before send hook ${hook.name}`)
    return hook({ req, res, dataset }, ...args)
  }))

  return res.dataset(dataset)
})

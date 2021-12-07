/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth
 */

import { HydraBox, middleware, ResourceLoader } from 'hydra-box'
import { HydraBoxMiddleware } from 'hydra-box/middleware'
import { Router } from 'express'
import rdfFactory from 'rdf-express-node-factory'
import RdfResource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import StreamClient from 'sparql-http-client/StreamClient'
import type { Api } from 'hydra-box/Api'
import { logRequest, logRequestError } from './lib/logger'
import { removeHydraOperations, disambiguateClassHierarchies } from './lib/middleware'
import { preprocessHydraResource, preprocessPayload } from './lib/middleware/preprocessResource'
import { SparqlQueryLoader } from './lib/loader'
import { ensureArray } from './lib/array'
import { CodeLoader, codeLoader } from './lib/code'

export { SparqlQueryLoader } from './lib/loader'

RdfResource.factory.addMixin(...Object.values(Hydra))

/**
 * Represents the runtime instance of a Labyrinth API
 *
 * Accessible on the `Request` object of an express handler
 *
 * ```ts
 * import type { Request } from 'express'
 *
 * function handler(req: Request) {
 *   const { labyrinth } = req
 * }
 * ```
 */
export interface Labyrinth {
  /**
   * Gets or sets a streaming client to access the databse
   */
  sparql: StreamClient

  /**
   * Gets the default configuration for collection handler
   */
  collection: {
    /**
     * Default collection page size
     */
    pageSize: number
  }
}

declare module 'express-serve-static-core' {
  export interface Request {
    hydra: HydraBox
    loadCode: CodeLoader
    labyrinth: Labyrinth
  }
}

/**
 * Parameters to configure labyrinth middleware
 */
export type MiddlewareParams = {
  api: Api
  codePath: string
  loader?: ResourceLoader
  path: string
  sparql: StreamClient.StreamClientOptions
  middleware?: HydraBoxMiddleware
  options?: {
    collection?: {
      pageSize?: number
    }
  }
}

/**
 * Creates the labyrinth express middleware
 */
export async function hydraBox(middlewareInit: MiddlewareParams): Promise<Router> {
  const { loader, sparql, options, api, ...params } = middlewareInit

  if (!('endpointUrl' in sparql)) {
    throw new Error('Missing endpointUrl in SPARQL options')
  }

  const app = Router()

  const labyrinth = {
    sparql: new StreamClient(sparql),
    collection: {
      pageSize: options?.collection?.pageSize || 10,
    },
  }
  app.use(rdfFactory())
  app.use((req, res, next) => {
    req.labyrinth = labyrinth
    req.loadCode = (...args) => codeLoader(req.hydra.api)(...args)
    next()
  })

  app.use(logRequest)
  app.use(middleware(
    api,
    {
      baseIriFromRequest: true,
      loader: loader ?? new SparqlQueryLoader(sparql),
      middleware: {
        operations: [
          removeHydraOperations,
          disambiguateClassHierarchies,
          ...ensureArray(params.middleware?.operations),
        ],
        resource: [
          preprocessPayload,
          preprocessHydraResource,
          ...ensureArray(params.middleware?.resource),
        ],
      },
    }))

  app.use(logRequestError)

  return app
}

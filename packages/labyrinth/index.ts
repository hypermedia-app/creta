/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth
 */

import { HydraBox, middleware, ResourceLoader } from 'hydra-box'
import { HydraBoxMiddleware } from 'hydra-box/middleware'
import cors from 'cors'
import { Router } from 'express'
import rdfFactory from 'rdf-express-node-factory'
import RdfResource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import StreamClient from 'sparql-http-client/StreamClient'
import { GraphPointer } from 'clownface'
import type { Api } from 'hydra-box/Api'
import { logRequest, logRequestError } from './lib/logger'
import { removeHydraOperations, preprocessResource, disambiguateClassHierarchies } from './lib/middleware'
import { SparqlQueryLoader } from './lib/loader'
import { ensureArray } from './lib/array'

export { SparqlQueryLoader } from './lib/loader'

RdfResource.factory.addMixin(...Object.values(Hydra))

/**
 * Represents the runtime instance of a Labyrinth API
 *
 * Accessible on the `Request` object of an express handlere
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
    loadCode<T extends any = unknown>(node: GraphPointer, options?: Record<any, any>): T | Promise<T> | null
    labyrinth: Labyrinth
  }
}

/**
 * Parameters to configure labyrinth middleware
 */
export type MiddlewareParams = {
  // eslint-disable-next-line no-use-before-define
  loadApi: ApiFactory
  codePath: string
  loader?: ResourceLoader
  path: string
  sparql: ConstructorParameters<typeof StreamClient>[0] & {
    endpointUrl: string
  }
  middleware?: HydraBoxMiddleware
  options?: {
    collection?: {
      pageSize?: number
    }
  }
}

export type ApiFactoryOptions = Omit<MiddlewareParams, 'loadApi'>

/**
 * Callable interface which gets called on application start to initialize the instance
 * of `hydra:ApiDocumentation`
 */
export interface ApiFactory {
  (params: ApiFactoryOptions): Promise<Api>
}

/**
 * Creates the labyrinth express middleware
 */
export async function hydraBox(middlewareInit: MiddlewareParams): Promise<Router> {
  const { loader, sparql, options, loadApi, ...params } = middlewareInit

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
    req.loadCode = (node, options) => req.hydra.api.loaderRegistry.load<any>(node, {
      basePath: req.hydra.api.codePath,
      ...(options || {}),
    })
    next()
  })

  app.use(logRequest)
  app.use(cors({
    exposedHeaders: ['link', 'location'],
  }))
  app.use(middleware(
    await loadApi(middlewareInit),
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
          preprocessResource(),
          ...ensureArray(params.middleware?.resource),
        ],
      },
    }))

  app.use(logRequestError)

  return app
}

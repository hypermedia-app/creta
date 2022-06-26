/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth
 */

import { NamedNode } from 'rdf-js'
import { HydraBox, middleware, ResourceLoader } from 'hydra-box'
import { HydraBoxMiddleware } from 'hydra-box/middleware'
import { RequestHandler, Router } from 'express'
import rdfFactory from 'rdf-express-node-factory'
import RdfResource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import StreamClient from 'sparql-http-client/StreamClient'
import type { Api } from 'hydra-box/Api'
import { GraphPointer } from 'clownface'
import DatasetExt from 'rdf-ext/lib/Dataset'
import { loadRepresentation } from './lib/resource'
import { logRequest, logRequestError } from './lib/logger'
import { removeHydraOperations, disambiguateClassHierarchies } from './lib/middleware'
import { preprocessHydraResource, preprocessPayload } from './lib/middleware/preprocessResource'
import { MinimalRepresentationLoader } from './lib/middleware/returnMinimal'
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
   * Gets or sets a streaming client to access the database
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

  /**
   * Gets the implementation used to retrieve a resource's minimal representation
   */
  minimalRepresentation?: MinimalRepresentationLoader

  /**
   * Gets the full representation of the requested resource
   */
  fullRepresentation(): Promise<GraphPointer<NamedNode, DatasetExt>>
}

declare module 'express-serve-static-core' {
  export interface Request {
    hydra: HydraBox
    loadCode: CodeLoader
    labyrinth: Labyrinth
  }
}

type Options = Partial<Pick<Labyrinth, 'collection' | 'minimalRepresentation'>>

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
  options?: Options
}

export const labyrinthInit = (sparql: StreamClient.StreamClientOptions, options: Options | undefined): RequestHandler => (req, res, next) => {
  const labyrinth: Labyrinth = {
    sparql: new StreamClient(sparql),
    collection: {
      pageSize: options?.collection?.pageSize || 10,
    },
    minimalRepresentation: options?.minimalRepresentation,
    fullRepresentation: loadRepresentation(req),
  }

  if (!req.labyrinth) {
    req.labyrinth = Object.freeze(labyrinth)
    req.loadCode = (...args) => codeLoader(req.hydra.api)(...args)
  }

  next()
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

  app.use(rdfFactory())
  app.use(labyrinthInit(sparql, options))

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

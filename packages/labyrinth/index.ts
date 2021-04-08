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
import { removeHydraOperations, preprocessResource } from './lib/middleware'
import { SparqlQueryLoader } from './lib/loader'
import { ensureArray } from './lib/array'

export { SparqlQueryLoader } from './lib/loader'

RdfResource.factory.addMixin(...Object.values(Hydra))

declare module 'express-serve-static-core' {
  export interface Request {
    hydra: HydraBox
    loadCode<T extends any = unknown>(node: GraphPointer, options?: Record<any, any>): T | Promise<T> | null
    labyrinth: {
      sparql: StreamClient
      collection: {
        pageSize: number
      }
    }
  }
}

type MiddlewareParams = {
  // eslint-disable-next-line no-use-before-define
  loadApi: ApiFactory
  codePath: string
  loader?: ResourceLoader
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

export interface ApiFactory {
  (params: Omit<MiddlewareParams, 'loadApi'>): Promise<Api>
}

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

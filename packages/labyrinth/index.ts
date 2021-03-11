import { HydraBox, middleware, ResourceLoader } from 'hydra-box'
import { HydraBoxMiddleware } from 'hydra-box/middleware'
import cors from 'cors'
import { Router } from 'express'
import RdfResource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import StreamClient from 'sparql-http-client/StreamClient'
import { logRequest, logRequestError } from './lib/logger'
import { NamedNode } from 'rdf-js'
import { removeHydraOperations, preprocessResource } from './lib/middleware'
import { SparqlQueryLoader } from './lib/loader'
import { ensureArray } from './lib/array'
import type { Api } from 'hydra-box/Api'

export { SparqlQueryLoader } from './lib/loader'

RdfResource.factory.addMixin(...Object.values(Hydra))

export interface User {
  id?: NamedNode
}

declare module 'express-serve-static-core' {
  export interface Request {
    user?: User
    hydra: HydraBox
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
  const { loader, codePath, sparql, options, loadApi, ...params } = middlewareInit

  const app = Router()

  const labyrinth = {
    sparql: new StreamClient(sparql),
    collection: {
      pageSize: options?.collection?.pageSize || 10,
    },
  }
  app.use((req, res, next) => {
    req.labyrinth = labyrinth
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
          preprocessResource(codePath),
          ...ensureArray(params.middleware?.resource),
        ],
      },
    }))

  app.use(logRequestError)

  return app
}

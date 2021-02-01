import { HydraBox, middleware, ResourceLoader, Options } from 'hydra-box'
import cors from 'cors'
import { Router } from 'express'
import RdfResource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import StreamClient from 'sparql-http-client/StreamClient'
import { ApiInit, createApi } from './lib'
import { NotFoundError } from './lib/error'
import { logRequest, logRequestError } from './lib/logger'
import { NamedNode } from 'rdf-js'
import { removeHydraOperations, preprocessResource } from './lib/middleware'
import { SparqlQueryLoader } from './lib/loader'
import { ensureArray } from './lib/array'

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

type MiddlewareParams = ApiInit & {
  loader?: ResourceLoader
  sparql: ConstructorParameters<typeof StreamClient>[0] & {
    endpointUrl: string
  }
  middleware?: Options['middleware']
  options?: {
    collection?: {
      pageSize?: number
    }
  }
}

export async function hydraBox(middlewareInit: MiddlewareParams): Promise<Router> {
  const { loader, codePath, sparql, options, ...params } = middlewareInit

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
    await createApi(middlewareInit),
    {
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

  app.use(function (req, res, next) {
    next(new NotFoundError())
  })
  app.use(logRequestError)

  return app
}

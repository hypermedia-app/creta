import { HydraBox, middleware, ResourceLoader } from 'hydra-box'
import cors from 'cors'
import { Express } from 'express'
import RdfResource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import StreamClient from 'sparql-http-client/StreamClient'
import { ApiInit, createApi } from './lib'
import { NotFoundError } from './lib/error'
import { logRequest, logRequestError } from './lib/logger'
import { httpProblemMiddleware } from './lib/problemDetails'
import { IErrorMapper } from 'http-problem-details-mapper'
import { NamedNode } from 'rdf-js'
import { removeHydraTypes, preprocessResource } from './lib/middleware'
import { SparqlQueryLoader } from './lib/loader'

export { SparqlQueryLoader } from './lib/loader'

RdfResource.factory.addMixin(...Object.values(Hydra))

export interface User {
  id?: NamedNode
}

declare module 'express-serve-static-core' {
  interface Application {
    sparql: StreamClient
    labyrinth: {
      collection: {
        pageSize: number
      }
    }
  }

  export interface Request {
    user?: User
    hydra: HydraBox
  }
}

type MiddlewareParams = ApiInit & {
  loader?: ResourceLoader
  errorMappers?: IErrorMapper[]
  auth?: {
    permissionProperty?: string
  }
  sparql: {
    endpointUrl: string
    storeUrl?: string
    updateUrl?: string
    user?: string
    password?: string
  }
  options?: {
    collection?: {
      pageSize?: number
    }
  }
}

export async function hydraBox(app: Express, middlewareInit: MiddlewareParams): Promise<void> {
  const { loader, codePath, errorMappers = [], sparql, options } = middlewareInit

  app.sparql = new StreamClient(sparql)

  app.labyrinth = {
    collection: {
      pageSize: options?.collection?.pageSize || 10,
    },
  }

  app.use(logRequest)
  app.use(cors({
    exposedHeaders: ['link', 'location'],
  }))
  app.use(middleware(
    await createApi(middlewareInit),
    {
      loader: loader ?? new SparqlQueryLoader(sparql),
      middleware: {
        resource: [
          removeHydraTypes,
          preprocessResource(codePath),
        ],
      },
    }))

  app.use(function (req, res, next) {
    next(new NotFoundError())
  })
  app.use(logRequestError)
  app.use(httpProblemMiddleware(errorMappers))
}

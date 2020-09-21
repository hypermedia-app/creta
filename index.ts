import { HydraBox, middleware, ResourceLoader } from 'hydra-box'
import cors from 'cors'
import { Express } from 'express'
import RdfResource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import StreamClient from 'sparql-http-client/StreamClient'
import { createApi } from './lib'
import { NotFoundError } from './lib/error'
import { logRequest, logRequestError } from './lib/logger'
import { httpProblemMiddleware } from './lib/problemDetails'
import { IErrorMapper } from 'http-problem-details-mapper'
import { removeHydraTypes, preprocessResource } from './lib/middleware'
import { SparqlQueryLoader } from './lib/loader'

export { SparqlQueryLoader } from './lib/loader'

RdfResource.factory.addMixin(...Object.values(Hydra))

declare module 'express-serve-static-core' {
  interface Locals {
    sparql?: StreamClient
  }

  export interface Request {
    hydra: HydraBox
  }
}

interface MiddlewareParams {
  loader?: ResourceLoader
  baseUri: string
  codePath: string
  apiPath: string
  errorMappers?: IErrorMapper[]
  sparql?: {
    endpointUrl: string
    storeUrl: string
    updateUrl: string
    user?: string
    password?: string
  }
}

export async function hydraBox(app: Express, { loader, baseUri, codePath, apiPath, errorMappers = [], sparql }: MiddlewareParams): Promise<void> {
  if (sparql) {
    app.locals.sparql = new StreamClient(sparql)
  }

  app.use(logRequest)
  app.use(cors({
    exposedHeaders: ['link', 'location'],
  }))
  app.use(middleware(
    await createApi({ baseUri, codePath, apiPath }),
    {
      loader: loader ?? (sparql ? new SparqlQueryLoader(sparql) : undefined),
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

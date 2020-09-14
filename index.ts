import { middleware, ResourceLoader } from 'hydra-box'
import cors from 'cors'
import { Router } from 'express'
import RdfResource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import { createApi } from './lib'
import { NotFoundError } from './lib/error'
import { logRequest, logRequestError } from './lib/logger'
import { httpProblemMiddleware } from './lib/problemDetails'
import { IErrorMapper } from 'http-problem-details-mapper'
import { removeHydraTypes, preprocessResource } from './lib/middleware'

export { SparqlQueryLoader } from './lib/loader'

RdfResource.factory.addMixin(...Object.values(Hydra))

interface MiddlewareParams {
  loader: ResourceLoader
  baseUri: string
  codePath: string
  apiPath: string
  errorMappers?: IErrorMapper[]
}

export async function hydraBox(app: Router, { loader, baseUri, codePath, apiPath, errorMappers = [] }: MiddlewareParams): Promise<void> {
  app.use(logRequest)
  app.use(cors({
    exposedHeaders: ['link', 'location'],
  }))
  app.use(middleware(
    await createApi({ baseUri, codePath, apiPath }),
    {
      loader,
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

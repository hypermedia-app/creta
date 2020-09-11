import { middleware, ResourceLoader } from 'hydra-box'
import cors from 'cors'
import { RequestHandler, Router } from 'express'
import RdfResource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import { createApi } from './lib'
import { preprocessResource } from './lib/loader'
import { NotFoundError } from './lib/error'
import { logRequest, logRequestError } from './lib/logger'
import { httpProblemMiddleware } from './lib/problemDetails'
import { IErrorMapper } from 'http-problem-details-mapper'
import { removeHydraTypes } from './lib/middleware'

export { SparqlQueryLoader } from './lib/loader'

RdfResource.factory.addMixin(...Object.values(Hydra))

interface MiddlewareParams {
  loader: ResourceLoader
  baseUri: string
  codePath: string
  apiPath: string
  errorMappers?: IErrorMapper[]
}

export async function hydraBox({ loader, baseUri, codePath, apiPath, errorMappers = [] }: MiddlewareParams): Promise<RequestHandler> {
  const router = Router()

  router.use(logRequest)
  router.use(cors({
    exposedHeaders: ['link', 'location'],
  }))
  router.use(middleware(
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

  router.use(function (req, res, next) {
    next(new NotFoundError())
  })
  router.use(logRequestError)
  router.use(httpProblemMiddleware(errorMappers))

  return router
}

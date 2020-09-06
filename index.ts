import { middleware, ResourceLoader } from 'hydra-box'
import cors from 'cors'
import { RequestHandler, Router } from 'express'
import debug, { Debugger } from 'debug'
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
  log?: Debugger
  errorMappers?: IErrorMapper[]
}

export async function hydraBox({ loader, baseUri, codePath, apiPath, log = debug('app'), errorMappers = [] }: MiddlewareParams): Promise<RequestHandler> {
  const router = Router()

  router.use(logRequest(log))
  router.use(cors({
    exposedHeaders: ['link', 'location'],
  }))
  router.use(middleware(
    await createApi({ baseUri, codePath, apiPath, log }),
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
  router.use(logRequestError(log))
  router.use(httpProblemMiddleware(errorMappers))

  return router
}

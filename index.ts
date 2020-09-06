import { middleware } from 'hydra-box'
import cors from 'cors'
import { Express } from 'express'
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
  loader: any
  baseUri: string
  codePath: string
  apiPath: string
  log?: Debugger
  errorMappers?: IErrorMapper[]
}

export async function hydraBox(app: Express, { loader, baseUri, codePath, apiPath, log = debug('app'), errorMappers = [] }: MiddlewareParams) {
  app.use(logRequest(log))
  app.use(cors({
    exposedHeaders: ['link', 'location'],
  }))
  app.use(middleware(
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

  app.use(function (req, res, next) {
    next(new NotFoundError())
  })
  app.use(logRequestError(log))
  app.use(httpProblemMiddleware(errorMappers))
}

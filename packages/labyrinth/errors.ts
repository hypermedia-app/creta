import { ErrorRequestHandler, Request, RequestHandler } from 'express'
import * as error from 'express-rdf-problem-details'
import { NotFoundErrorMapper } from './lib/error/NotFound'
import { ForbiddenErrorMapper } from './lib/error/ForbiddenError'
import { UnauthorizedErrorMapper } from './lib/error/UnauthorizedError'
import { ErrorMapperConstructor, FallbackErrorMapper, NotFoundError } from './lib/error'
import { HydraError } from './lib/error/HydraError'

interface MappersFactory {
  (arg: { req: Request }): Promise<ErrorMapperConstructor[]>
}

interface Options {
  errorMappers?: ErrorMapperConstructor[] | MappersFactory
  captureNotFound?: boolean
}

export function problemJson({ errorMappers, captureNotFound = false }: Options = {}): [RequestHandler, ErrorRequestHandler] {
  let finalHandler: ErrorRequestHandler

  return [
    (req, res, next) => {
      if (captureNotFound) {
        return next(new NotFoundError())
      }
      return next()
    },
    async (err: unknown, req, res, next) => {
      if (!finalHandler) {
        finalHandler = await createHandler(req, errorMappers)
      }

      finalHandler(err, req, res, next)
    },
  ]
}

async function createHandler(req: Request, mappersOrFactory: Options['errorMappers'] = []) {
  let mapperTypes: ErrorMapperConstructor[]
  if (Array.isArray(mappersOrFactory)) {
    mapperTypes = mappersOrFactory
  } else {
    mapperTypes = await mappersOrFactory({ req })
  }

  const mappers = [
    NotFoundErrorMapper, ForbiddenErrorMapper, UnauthorizedErrorMapper, FallbackErrorMapper,
    ...mapperTypes,
  ].map(Base => new (HydraError(Base))())

  return error.handler({ mappers })
}

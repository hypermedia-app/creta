import { ErrorRequestHandler, RequestHandler } from 'express'
import { IErrorMapper } from 'http-problem-details-mapper'
import * as error from 'express-rdf-problem-details'
import { NotFoundErrorMapper } from './lib/error/NotFound'
import { ForbiddenErrorMapper } from './lib/error/ForbiddenError'
import { UnauthorizedErrorMapper } from './lib/error/UnauthorizedError'
import { FallbackErrorMapper, NotFoundError } from './lib/error'

interface Options {
  errorMappers?: IErrorMapper[]
  captureNotFound?: boolean
}

export function problemJson({ errorMappers = [], captureNotFound = false }: Options = {}): [RequestHandler, ErrorRequestHandler] {
  return [
    (req, res, next) => {
      if (captureNotFound) {
        return next(new NotFoundError())
      }
      return next()
    },
    error.handler({
      mappers: [
        new NotFoundErrorMapper(),
        new ForbiddenErrorMapper(),
        new UnauthorizedErrorMapper(),
        ...errorMappers,
        new FallbackErrorMapper(),
      ],
    }),
  ]
}

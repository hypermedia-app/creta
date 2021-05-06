import { ErrorRequestHandler, RequestHandler } from 'express'
import { IErrorMapper } from 'http-problem-details-mapper'
import { httpProblemMiddleware } from './lib/problemDetails'
import { NotFoundError } from './lib/error'

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
    httpProblemMiddleware(...errorMappers),
  ]
}

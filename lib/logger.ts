import type { NextFunction, Request, Response } from 'express'
import { Debugger } from 'debug'
import type { RequestHandler } from 'express-serve-static-core'

function extendLog(log: Debugger) {
  const requestLogger = log.extend('request')
  const requestErrorLogger = requestLogger.extend('error')
  const headersLogger = requestLogger.extend('headers')

  return { requestLogger, requestErrorLogger, headersLogger }
}

export const logRequest = (log: Debugger): RequestHandler => {
  const { requestLogger, headersLogger } = extendLog(log)

  return function (req: Request, res: Response, next: NextFunction) {
    requestLogger(`${req.method} ${req.url}`)

    if (headersLogger.enabled) {
      headersLogger(`${Object.entries(req.headers).map(([header, value]) => `${header}: '${value}'`).join('\n')}`)
    }

    res.on('finish', () => {
      requestLogger(`Status ${res.statusCode}`)
    })

    next()
  } as any
}

export const logRequestError = (log: Debugger): RequestHandler => {
  const { requestErrorLogger } = extendLog(log)

  return function (err: Error, req: Request, res: Response, next: NextFunction) {
    requestErrorLogger('Request failed: %o', err)
    next(err)
  } as any
}

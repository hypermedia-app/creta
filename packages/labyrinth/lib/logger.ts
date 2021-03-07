import type { NextFunction, Request, Response } from 'express'
import debug from 'debug'

export const log = debug('labyrinth')
export const error = log.extend('error')
export const warn = log.extend('warn')

const requestLogger = log.extend('request')
const requestErrorLogger = requestLogger.extend('error')
const headersLogger = requestLogger.extend('headers')

export function logRequest(req: Request, res: Response, next: NextFunction) {
  requestLogger(`${req.method} ${req.url}`)

  if (headersLogger.enabled) {
    headersLogger(`${Object.entries(req.headers).map(([header, value]) => `${header}: '${value}'`).join('\n')}`)
  }

  res.on('finish', () => {
    requestLogger(`Status ${res.statusCode}`)
  })

  next()
}

export function logRequestError(err: Error, req: Request, res: Response, next: NextFunction) {
  requestErrorLogger('Request failed: %o', err)
  next(err)
}

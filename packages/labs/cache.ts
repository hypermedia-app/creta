import type { BeforeSend } from '@hydrofoil/labyrinth/middleware'
import type { MiddlewareFactory } from '@hydrofoil/knossos/configuration'
import { prefersMinimal } from '@hydrofoil/labyrinth/lib/request'
import toCanonical from 'rdf-dataset-ext/toCanonical.js'
import etag from 'etag'
import expressPreconditions, { Options } from 'express-preconditions'
import createError from 'http-errors'
import { fetchHead } from './lib/cache'

export type Headers = { etag?: boolean; 'cache-control'?: string }

export const setHeaders: BeforeSend<[Headers]> = ({ req, res, dataset }, headers = {}) => {
  if (headers['cache-control']) {
    res.setHeader('cache-control', headers['cache-control'])
  }

  if (headers.etag) {
    const weak = !prefersMinimal(req)
    res.setHeader('etag', etag(toCanonical(dataset), { weak }))
  }
}

export const preconditions: MiddlewareFactory<[Pick<Options, 'stateAsync' | 'requiredWith'>]> =
  async (_, { stateAsync = fetchHead(), requiredWith } = {}) => (req, res, next) => {
    expressPreconditions({
      stateAsync,
      requiredWith,
      error(status, detail) {
        if (status >= 400) {
          return next(createError(status, detail))
        }

        return res.sendStatus(status)
      },
    })(req, res, next)
  }

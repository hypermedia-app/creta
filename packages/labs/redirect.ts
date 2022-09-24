import type { MiddlewareFactory } from '@hydrofoil/knossos/lib/settings'
import type { Request } from 'express'
import asyncMiddleware from 'middleware-async'

type WebPageRedirectParams = {
  rewrite?(path: string, req: Request): string | null | undefined | Promise<string | null | undefined>
  status?: number
}

export const webPage: MiddlewareFactory<[WebPageRedirectParams]> = (context, { rewrite, status = 303 } = {}) => asyncMiddleware(async (req, res, next) => {
  if (req.headers.accept && req.headers.accept !== '*/*' && req.accepts('html')) {
    const webPageUrl = await rewrite?.(req.path, req)
    if (webPageUrl === req.path) {
      return next(new Error('Redirect path cannot be same as resource path'))
    }

    if (webPageUrl) {
      return res.redirect(status, webPageUrl)
    }
  }

  return next()
})

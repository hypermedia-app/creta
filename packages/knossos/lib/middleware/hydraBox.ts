import * as express from 'express'
import { hydraBox } from '@hydrofoil/labyrinth'
import webAccessControl from 'hydra-box-web-access-control'
import createApi from '../api'
import { filterAclByApi } from '../accessControl'
import type { Context, Options } from '../../server'
import { loadMiddlewares, loadAuthorizationPatterns } from '../settings'
import { systemAuth } from './systemAuth'

export async function createHydraBox({ apiTerm, client, sparql, ...ctx }: Context, options: Options): Promise<express.RequestHandler> {
  const { log, name, codePath, path } = options
  const router = express.Router()

  const api = createApi({ apiTerm, log, sparql, codePath, path })

  const loadContext = { apiTerm, client, sparql, ...ctx }
  const middleware = await loadMiddlewares(api, log, loadContext)
  const authorizationPatterns = await loadAuthorizationPatterns(api, log, loadContext)

  if (middleware.before) {
    router.use(middleware.before)
  }

  router.use(systemAuth({ log, name }))

  router.use(await hydraBox({
    codePath,
    sparql,
    path,
    api,
    middleware: {
      resource: [
        webAccessControl({
          client,
          additionalPatterns: filterAclByApi,
          additionalChecks: authorizationPatterns,
        }),
        ...(middleware.resource || []),
      ],
      operations: middleware.operations,
    },
  }))

  return router
}

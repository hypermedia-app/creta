import * as express from 'express'
import { hydraBox, labyrinthInit } from '@hydrofoil/labyrinth'
import webAccessControl from 'hydra-box-web-access-control'
import { Debugger } from 'debug'
import createApi from '../api'
import { filterAclByApi } from '../accessControl'
import type { Context } from '../..'
import { loadMiddlewares, loadAuthorizationPatterns } from '../settings'
import { systemAuth } from './systemAuth'

interface CreateHydraBox {
  name: string
  codePath: string
  path: string
  log: Debugger
}

export async function createHydraBox({ apiTerm, client, sparql, ...ctx }: Context, options: CreateHydraBox): Promise<express.RequestHandler> {
  const { log, name, codePath, path } = options
  const router = express.Router()

  const api = createApi({ apiTerm, log, sparql, codePath, path })

  const loadContext = { apiTerm, client, sparql, ...ctx }
  const middleware = await loadMiddlewares(api, log, loadContext)
  const authorizationPatterns = await loadAuthorizationPatterns(api, log, loadContext)

  router.use(labyrinthInit(sparql, undefined))

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

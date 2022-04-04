import * as express from 'express'
import { hydraBox, labyrinthInit } from '@hydrofoil/labyrinth'
import webAccessControl from 'hydra-box-web-access-control'
import { Debugger } from 'debug'
import { loadConfiguration, loadMiddlewares, loadAuthorizationPatterns } from '../settings'
import createApi from '../api'
import { filterAclByApi } from '../accessControl'
import type { Context } from '../..'
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
  const config = await loadConfiguration(api, loadContext)
  if (!config) {
    log('No configuration resource found')
  }

  const middleware = await loadMiddlewares(api, log, loadContext, { config })
  const authorizationPatterns = await loadAuthorizationPatterns(api, log, { config })

  router.use(labyrinthInit(sparql, undefined))
  router.use((req, res, next) => {
    if (config) {
      req.knossos.config = config
    }
    next()
  })

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

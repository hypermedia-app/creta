import * as express from 'express'
import { hydraBox, labyrinthInit } from '@hydrofoil/labyrinth'
import webAccessControl from 'hydra-box-web-access-control'
import { Debugger } from 'debug'
import * as settings from '../settings'
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
  const config = await settings.loadConfiguration(api, loadContext)
  if (!config) {
    log('No configuration resource found')
  }

  const middleware = await settings.loadMiddlewares(api, log, loadContext, { config })
  const authorizationPatterns = await settings.loadAuthorizationPatterns(api, log, { config })
  const loader = await settings.loadResourceLoader(api, log, loadContext, { config })
  const minimalRepresentation = await settings.loadMinimalRepresentation(api, log, config)

  router.use(labyrinthInit(sparql, {
    minimalRepresentation,
  }))
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
    loader,
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

/**
 * @packageDocumentation
 * @module @hydrofoil/knossos/server
 */

import express from 'express'
import { hydraBox } from '@hydrofoil/labyrinth'
import StreamClient from 'sparql-http-client/StreamClient'
import { resource } from 'express-rdf-request'
import { Debugger } from 'debug'
import cors from 'cors'
import webAccessControl from 'hydra-box-web-access-control'
import { knossosEvents } from '@hydrofoil/knossos-events'
import camo from 'camouflage-rewrite'
import { problemJson } from '../labyrinth/errors'
import createApi from './lib/api'
import { ResourcePerGraphStore, ResourceStore } from './lib/store'
import { create } from './resource'
import { systemAuth } from './lib/middleware/systemAuth'

export interface Knossos {
  store: ResourceStore
  log: Debugger
}

declare module 'express-serve-static-core' {
  interface Request {
    knossos: Knossos
  }
}

const app = express()

export interface Authentication {
  (arg: { client: StreamClient }): express.RequestHandler | Promise<express.RequestHandler>
}

interface Options {
  name: string
  log: Debugger
  endpointUrl: string
  updateUrl: string | undefined
  port: number
  codePath: string
  path: string
  resourceBase?: string
  user?: string
  password?: string
  middleware?: {
    authentication?: Authentication
  }
}

export async function serve({ log, endpointUrl, updateUrl, port, name, codePath, path, middleware, user, password, resourceBase }: Options) {
  const sparql = {
    endpointUrl,
    updateUrl: updateUrl || endpointUrl,
    user,
    password,
  }

  const client = new StreamClient(sparql)
  const store = new ResourcePerGraphStore(client)

  app.enable('trust proxy')
  app.use(cors())

  if (resourceBase) {
    app.use(camo({
      rewriteContent: true,
      rewriteHeaders: true,
      url: resourceBase,
    }))
  }
  if (middleware?.authentication) {
    app.use(await middleware.authentication({ client }))
  }
  app.use(systemAuth({ log, name }))
  app.use(resource({
    getTerm: req => req.hydra.term,
  }))
  app.use((req, res, next) => {
    req.knossos = {
      store,
      log,
    }
    next()
  })
  app.use(knossosEvents())
  app.use(await hydraBox({
    codePath,
    sparql,
    path,
    loadApi: createApi({
      store,
      log,
    }),
    middleware: {
      resource: webAccessControl({ client }),
    },
  }))
  app.put('/*', create(client))
  app.use(problemJson({ captureNotFound: true }))

  app.listen(port, () => log(`${name} started`))
}

import express from 'express'
import { hydraBox } from '@hydrofoil/labyrinth'
import StreamClient from 'sparql-http-client/StreamClient'
import { resource } from 'express-rdf-request'
import { Debugger } from 'debug'
import cors from 'cors'
import * as webAccessControl from 'hydra-box-middleware-wac'
import createApi from './lib/api'
import { ResourcePerGraphStore, ResourceStore } from './lib/store'
import { create } from './resource'
import { problemJson } from '../labyrinth/errors'
import { systemAuth } from './lib/middleware/systemAuth'
import * as events from './lib/events'

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

interface Options {
  name: string
  log: Debugger
  endpointUrl: string
  updateUrl: string | undefined
  port: number
  codePath: string
  path: string
  user?: string
  password?: string
  middleware?: {
    authentication?(arg: { client: StreamClient }): express.RequestHandler | Promise<express.RequestHandler>
  }
}

export async function serve({ log, endpointUrl, updateUrl, port, name, codePath, path, middleware, user, password }: Options) {
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

  if (middleware?.authentication) {
    app.use(await middleware.authentication({ client }))
  }
  app.use(systemAuth({ log, name }))
  app.use(resource(req => req.hydra.term))
  app.use((req, res, next) => {
    req.knossos = {
      store,
      log,
    }
    next()
  })
  app.use(events.attach)
  app.use(await hydraBox({
    codePath,
    sparql,
    loadApi: createApi({
      path,
      store,
      log,
    }),
    middleware: {
      resource: webAccessControl.middleware(client),
    },
  }))
  app.put('/*', create(client))
  app.use(problemJson({ captureNotFound: true }))

  app.listen(port, () => log(`${name} started`))
}

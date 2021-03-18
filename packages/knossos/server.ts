import express from 'express'
import { hydraBox } from '@hydrofoil/labyrinth'
import StreamClient from 'sparql-http-client/StreamClient'
import { resource } from 'express-rdf-request'
import { Debugger } from 'debug'
import cors from 'cors'
import * as webAccessControl from 'hydra-box-middleware-wac'
import createApi from './lib/api'
import { ResourcePerGraphStore } from './lib/store'
import { create } from './resource'
import { problemJson } from '../labyrinth/errors'
import { systemAuth } from './lib/middleware/systemAuth'

const app = express()

interface Options {
  name: string
  log: Debugger
  endpointUrl: string
  updateUrl: string | undefined
  port: number
  codePath: string
  path: string
  middleware?: {
    authentication?(arg: { client: StreamClient }): express.RequestHandler | Promise<express.RequestHandler>
  }
}

export async function serve({ log, endpointUrl, updateUrl, port, name, codePath, path, middleware }: Options) {
  const sparql = {
    endpointUrl,
    updateUrl: updateUrl || endpointUrl,
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

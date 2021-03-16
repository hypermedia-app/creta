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
import { authentication } from './lib/middleware/authentication'
import { systemAuth } from './lib/middleware/systemAuth'
import ParsingClient from 'sparql-http-client/ParsingClient'

const app = express()

interface Options {
  name: string
  log: Debugger
  endpointUrl: string
  updateUrl: string | undefined
  port: number
  codePath: string
  path: string
}

export async function serve({ log, endpointUrl, updateUrl, port, name, codePath, path }: Options) {
  const sparql = {
    endpointUrl,
    updateUrl: updateUrl || endpointUrl,
  }

  const client = new StreamClient(sparql)
  const parsingClient = new ParsingClient(sparql)
  const store = new ResourcePerGraphStore(client)

  app.enable('trust proxy')
  app.use(cors())

  app.use(await authentication())
  app.use(systemAuth({ log, client: parsingClient }))
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

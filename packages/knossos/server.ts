import express from 'express'
import { hydraBox } from '@hydrofoil/labyrinth'
import StreamClient from 'sparql-http-client/StreamClient'
import { resource } from 'express-rdf-request'
import debug from 'debug'
import cors from 'cors'
import createApi from './lib/api'
import { ResourcePerGraphStore } from './lib/store'
import { PUT as createResource } from './resource'
import { problemJson } from '../labyrinth/errors'

const app = express()

async function main() {
  const log = debug('knossos')

  const sparql = {
    endpointUrl: process.env.SPARQL_QUERY_ENDPOINT!,
    updateUrl: process.env.SPARQL_UPDATE_ENDPOINT!,
  }

  const store = new ResourcePerGraphStore(new StreamClient(sparql))

  app.enable('trust proxy')
  app.use(cors())

  app.use(resource(req => req.hydra.term))
  app.use((req, res, next) => {
    req.knossos = {
      store,
      log,
    }
    next()
  })
  app.use(await hydraBox({
    codePath: '.',
    sparql,
    loadApi: createApi({
      store,
      log,
    }),
  }))
  app.put('/*', createResource)
  app.use(problemJson({ captureNotFound: true }))

  app.listen(8888, () => log('API started'))
}

main().catch(debug('knossos').extend('error'))

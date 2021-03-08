import express from 'express'
import { hydraBox } from '@hydrofoil/labyrinth'
import StreamClient from 'sparql-http-client/StreamClient'
import { resource } from 'express-rdf-request'
import debug from 'debug'
import createApi from './lib/api'
import { ResourcePerGraphStore } from './lib/store'
import { put as createResource } from './resource'

const app = express()

async function main() {
  const log = debug('knossos')

  const sparql = {
    endpointUrl: 'http://localhost:3030/labyrinth',
    updateUrl: 'http://localhost:3030/labyrinth',
  }

  const store = new ResourcePerGraphStore(new StreamClient(sparql))

  app.use(resource)
  app.use((req, res, next) => {
    req.knossos = {
      store,
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

  app.listen(8888, () => log('API started'))
}

main().catch(debug('knossos').extend('error'))

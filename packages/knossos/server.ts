import express from 'express'
import { hydraBox } from '@hydrofoil/labyrinth'
import StreamClient from 'sparql-http-client/StreamClient'
import debug from 'debug'
import createApi from './lib/api'
import { ResourcePerGraphStore } from './lib/store'

const app = express()

async function main() {
  const log = debug('knossos')

  const sparql = {
    endpointUrl: 'http://localhost:3030/labyrinth',
    updateUrl: 'http://localhost:3030/labyrinth',
  }

  app.use(await hydraBox({
    codePath: './demo',
    sparql,
    loadApi: createApi({
      store: new ResourcePerGraphStore(new StreamClient(sparql)),
      log,
    }),
  }))

  app.listen(8888, () => log('API started'))
}

main().catch(debug('knossos').extend('error'))

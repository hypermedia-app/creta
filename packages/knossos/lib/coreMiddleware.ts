import { join } from 'path'
import $rdf from 'rdf-ext'
import express from 'express'
import type StreamClient from 'sparql-http-client/StreamClient'
import { Debugger } from 'debug'
import { createHydraBox } from './middleware/hydraBox'
import { ResourceStore } from './store'

interface Options {
  name: string
  path: string
  codePath: string
  client: StreamClient
  sparql: StreamClient.StreamClientOptions
  store: ResourceStore
  log: Debugger
}

export const coreMiddleware = ({ name, path, codePath, client, sparql, store, log }: Options): express.RequestHandler => {
  const apisMiddlewares = new Map()

  return async (req, res, next) => {
    let hydraMiddleware = apisMiddlewares.get(req.hostname)
    if (!hydraMiddleware) {
      const iri = new URL(req.absoluteUrl())
      const apiIri = new URL(join(req.baseUrl, path), iri)

      hydraMiddleware = await createHydraBox({
        apiTerm: $rdf.namedNode(apiIri.toString()),
        sparql,
        client,
        store,
      }, {
        name,
        codePath,
        path,
        log,
      })
      apisMiddlewares.set(req.hostname, hydraMiddleware)
    }

    hydraMiddleware(req, res, next)
  }
}

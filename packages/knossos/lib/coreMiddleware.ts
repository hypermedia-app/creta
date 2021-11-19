import { join } from 'path'
import $rdf from 'rdf-ext'
import express from 'express'
import type StreamClient from 'sparql-http-client/StreamClient'
import { Debugger } from 'debug'
import absoluteUrl from 'absolute-url'
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

export const coreMiddleware = ({ name, path, codePath, client, sparql, store, log }: Options, createApi = createHydraBox): express.RequestHandler => {
  const apisMiddlewares = new Map()

  return async (req, res, next) => {
    absoluteUrl.attach(req)

    const apiKey = req.hostname + req.baseUrl

    let hydraMiddleware = apisMiddlewares.get(apiKey)
    if (!hydraMiddleware) {
      const iri = new URL(req.absoluteUrl())
      const apiIri = new URL(join(req.baseUrl, path), iri)

      hydraMiddleware = await createApi({
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
      apisMiddlewares.set(apiKey, hydraMiddleware)
    }

    hydraMiddleware(req, res, next)
  }
}

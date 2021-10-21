/**
 * @packageDocumentation
 * @module @hydrofoil/knossos/server
 */

import path from 'path'
import { NamedNode } from 'rdf-js'
import express from 'express'
import StreamClient from 'sparql-http-client/StreamClient'
import { resource } from 'express-rdf-request'
import { Debugger } from 'debug'
import { knossosEvents } from '@hydrofoil/knossos-events'
import camo from 'camouflage-rewrite'
import { problemJson } from '@hydrofoil/labyrinth/errors'
import asyncMiddleware from 'middleware-async'
import $rdf from 'rdf-ext'
import absoluteUrl from 'absolute-url'
import { ResourcePerGraphStore, ResourceStore } from './lib/store'
import { create } from './resource'
import { createHydraBox } from './lib/middleware/hydraBox'

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
const apisMiddlewares = new Map()

export interface Authentication {
  (arg: { client: StreamClient }): express.RequestHandler | Promise<express.RequestHandler>
}

export interface Options {
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
}

export interface Context {
  apiTerm: NamedNode
  sparql: StreamClient.StreamClientOptions
  client: StreamClient
  store: ResourceStore
}

export async function serve(options: Options) {
  const { log, endpointUrl, updateUrl, port, name, user, password, resourceBase } = options
  const sparql = {
    endpointUrl,
    updateUrl: updateUrl || endpointUrl,
    user,
    password,
  }

  const client = new StreamClient(sparql)
  const store = new ResourcePerGraphStore(client)

  app.enable('trust proxy')

  if (resourceBase) {
    app.use(camo({
      rewriteContent: true,
      rewriteHeaders: true,
      url: resourceBase,
    }))
  }
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

  app.use(absoluteUrl())
  app.use(asyncMiddleware(async (req, res, next) => {
    let hydraMiddleware = apisMiddlewares.get(req.hostname)
    if (!hydraMiddleware) {
      const iri = new URL(req.absoluteUrl())
      const apiIri = new URL(path.join(req.baseUrl, options.path), iri)

      hydraMiddleware = await createHydraBox({
        apiTerm: $rdf.namedNode(apiIri.toString()),
        sparql,
        client,
        store,
      }, options)
      apisMiddlewares.set(req.hostname, hydraMiddleware)
    }

    hydraMiddleware(req, res, next)
  }))
  app.put('/*', create(client))
  app.use(problemJson({ captureNotFound: true }))

  app.listen(port, () => log(`${name} started`))
}

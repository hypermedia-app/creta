/**
 * @packageDocumentation
 * @module @hydrofoil/knossos/server
 */

import { join } from 'path'
import { NamedNode } from 'rdf-js'
import express from 'express'
import StreamClient from 'sparql-http-client/StreamClient'
import { resource } from 'express-rdf-request'
import debug, { Debugger } from 'debug'
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

const apisMiddlewares = new Map()

export interface Authentication {
  (arg: { client: StreamClient }): express.RequestHandler | Promise<express.RequestHandler>
}

export interface Options {
  name?: string
  endpointUrl: string
  updateUrl: string | undefined
  codePath?: string
  path?: string
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

export default function knossosMiddleware(options: Options): express.Router {
  const router = express.Router()

  const { name = 'knossos', codePath = '.', path = '/api', endpointUrl, updateUrl, user, password, resourceBase } = options
  const log = debug(name)
  const sparql = {
    endpointUrl,
    updateUrl: updateUrl || endpointUrl,
    user,
    password,
  }

  const client = new StreamClient(sparql)
  const store = new ResourcePerGraphStore(client)

  if (resourceBase) {
    router.use(camo({
      rewriteContent: true,
      rewriteHeaders: true,
      url: resourceBase,
    }))
  }
  router.use(resource({
    getTerm: req => req.hydra.term,
  }))
  router.use((req, res, next) => {
    req.knossos = {
      store,
      log,
    }
    next()
  })
  router.use(knossosEvents())

  router.use(absoluteUrl())
  router.use(asyncMiddleware(async (req, res, next) => {
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
  }))
  router.put('/*', create(client))
  router.use(problemJson({ captureNotFound: true }))

  return router
}

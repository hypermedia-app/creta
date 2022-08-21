/**
 * @packageDocumentation
 * @module @hydrofoil/knossos
 */

import { NamedNode } from 'rdf-js'
import express from 'express'
import StreamClient from 'sparql-http-client/StreamClient'
import { resource } from 'express-rdf-request'
import debug, { Debugger } from 'debug'
import { knossosEvents } from '@hydrofoil/knossos-events'
import camo from 'camouflage-rewrite'
import { problemJson } from '@hydrofoil/labyrinth/errors'
import asyncMiddleware from 'middleware-async'
import absoluteUrl from 'absolute-url'
import clownface, { GraphPointer } from 'clownface'
import $rdf from 'rdf-ext'
import { coreMiddleware } from './lib/coreMiddleware'
import { ResourcePerGraphStore, ResourceStore } from './lib/store'
import { create } from './resource'
import '@hydrofoil/labyrinth'

export interface Knossos {
  store: ResourceStore
  log: Debugger
  config: GraphPointer
}

declare module 'express-serve-static-core' {
  interface Request {
    knossos: Knossos
  }
}

export interface Authentication {
  (arg: { client: StreamClient }): express.RequestHandler | Promise<express.RequestHandler>
}

export interface Options {
  name?: string
  endpointUrl: string
  updateUrl?: string
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

export default function knossosMiddleware({
  endpointUrl,
  updateUrl,
  user,
  password,
  resourceBase,
  name = 'knossos',
  codePath = '.',
  path = '/api',
}: Options): express.Router {
  const router = express.Router()

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
      config: clownface({ dataset: $rdf.dataset() }).blankNode(),
    }
    next()
  })
  router.use(knossosEvents())

  router.use(absoluteUrl())
  router.use(asyncMiddleware(coreMiddleware({
    sparql,
    client,
    store,
    name,
    codePath,
    path,
    log,
  })))
  router.put('/*', create(client))
  router.use(problemJson({ captureNotFound: true }))

  return router
}

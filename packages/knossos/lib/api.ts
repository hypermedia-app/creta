import { NamedNode, Stream, Term } from 'rdf-js'
import type { Api } from 'hydra-box/Api'
import StreamClient from 'sparql-http-client/StreamClient'
import $rdf from 'rdf-ext'
import { Debugger } from 'debug'
import ApiBase from 'hydra-box/Api'
import { ApiFactory } from '@hydrofoil/labyrinth'
import { Handler } from '@hydrofoil/knossos-events'
import clownface, { GraphPointer } from 'clownface'
import DatasetExt from 'rdf-ext/lib/Dataset'
import express from 'express'
import httpStatus from 'http-status'
import { ResourceStore } from './store'
import * as query from './query'

interface ApiFromStore {
  store: ResourceStore
  log?: Debugger
  loadClasses?(): Promise<Stream>
}

function assertTerm(term: Term | undefined): asserts term is NamedNode {
  if (!term) {
    throw new Error('API Documentation term not set')
  }

  if (term.termType !== 'NamedNode') {
    throw new Error('API Documentation term must be a named node')
  }
}

export const invalidate: Handler = ({ req }) => {
  req.knossos.log('ApiDocumentation will be reloaded on next request')
  req.hydra.api.initialized = false
}

export const DELETE: express.RequestHandler = (req, res) => {
  req.hydra.api.initialized = false
  res.send(httpStatus.NO_CONTENT)
}

const createApi: (arg: ApiFromStore) => ApiFactory = ({ store, log, loadClasses = query.loadClasses }) => async ({ path = '/api', sparql, codePath }) => {
  const client = new StreamClient(sparql)

  return new (class extends ApiBase implements Api {
    constructor() {
      super({ path, codePath, dataset: $rdf.dataset() })
    }

    async init() {
      assertTerm(this.term)

      if (this.initialized) {
        return
      }

      log?.('Initializing API %s', this.term.value)

      let api: GraphPointer<NamedNode, DatasetExt>

      const apiExists = await store.exists(this.term)
      if (!apiExists) {
        api = clownface({ dataset: $rdf.dataset(), term: this.term })
      } else {
        api = await store.load(this.term)
      }

      const resources = await loadClasses(this.term, client)
      await api.dataset.import(resources)

      this.dataset = api.dataset
      this.initialized = true
    }
  })()
}

export default createApi

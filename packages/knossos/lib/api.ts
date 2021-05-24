import { NamedNode, Stream, Term } from 'rdf-js'
import type { Api } from 'hydra-box/Api'
import StreamClient from 'sparql-http-client/StreamClient'
import $rdf from 'rdf-ext'
import { Debugger } from 'debug'
import ApiBase from 'hydra-box/Api'
import { ApiFactory } from '@hydrofoil/labyrinth'
import clownface from 'clownface'
import express from 'express'
import httpStatus from 'http-status'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import * as query from './query'

interface ApiFromStore {
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

export const invalidate = ({ req }: { req: express.Request }) => {
  req.knossos.log('ApiDocumentation will be reloaded on next request')
  req.hydra.api.initialized = false
}

export const Invalidate: express.RequestHandler = (req, res) => {
  invalidate({ req })
  res.send(httpStatus.NO_CONTENT)
}

const createApi: (arg: ApiFromStore) => ApiFactory = ({ log, loadClasses = query.loadClasses }) => async ({ path = '/api', sparql, codePath }) => {
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

      const dataset = $rdf.dataset()
      await Promise.all([
        dataset.import(await DESCRIBE`${this.term}`.execute(client.query)),
        dataset.import(await loadClasses(this.term, client)),
      ])

      const api = clownface({ dataset, term: this.term })

      const supportedClasses = api.any().has(rdf.type, hydra.Class)
      api.node(this.term).addOut(hydra.supportedClass, supportedClasses)

      this.dataset = api.dataset
      this.initialized = true
    }
  })()
}

export default createApi

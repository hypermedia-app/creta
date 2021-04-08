import { NamedNode, Term } from 'rdf-js'
import type { Api } from 'hydra-box/Api'
import StreamClient from 'sparql-http-client/StreamClient'
import $rdf from 'rdf-ext'
import { Debugger } from 'debug'
import ApiBase from 'hydra-box/Api'
import { ApiFactory } from '@hydrofoil/labyrinth'
import { CONSTRUCT } from '@tpluscode/sparql-builder'
import { hydra } from '@tpluscode/rdf-ns-builders'
import { Handler } from '@hydrofoil/express-events'
import { ResourceStore } from './store'

interface ApiFromStore {
  path: string
  store: ResourceStore
  log?: Debugger
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

const createApi: (arg: ApiFromStore) => ApiFactory = ({ path, store, log }) => async ({ sparql, codePath }) => {
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

      const apiExists = await store.exists(this.term)
      if (!apiExists) {
        throw new Error(`ApiDocumentation <${this.term.value}> resource not found`)
      }

      const api = await store.load(this.term)

      const resources = await CONSTRUCT`?s ?p ?o . ?c ?cp ?co. ${this.term} ${hydra.supportedClass} ?c`
        .WHERE`
          ?c a ${hydra.Class} ; ?cp ?co .
          ?c (<>|!<>)+ ?s .
          ?s ?p ?o .
        `.execute(client.query)
      await api.dataset.import(resources)

      this.dataset = api.dataset
      this.initialized = true
    }
  })()
}

export default createApi

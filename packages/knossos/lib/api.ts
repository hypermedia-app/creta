import type { Api } from 'hydra-box/Api'
import StreamClient from 'sparql-http-client/StreamClient'
import $rdf from 'rdf-ext'
import { Debugger } from 'debug'
import ApiBase from 'hydra-box/Api'
import { Term } from 'rdf-js'
import { ApiFactory } from '../../labyrinth'
import { ResourceStore } from './store'
import * as apiDocResources from './apiDocumentation'
import { CONSTRUCT } from '@tpluscode/sparql-builder'
import { hydra } from '@tpluscode/rdf-ns-builders'

interface ApiFromStore {
  path?: string
  store: ResourceStore
  log: Debugger
}

function assertTerm(term: Term | undefined): asserts term {
  if (!term) {
    throw new Error('API Documentation term not set')
  }
}

const createApi: (arg: ApiFromStore) => ApiFactory = ({ path = '/api', store, log }) => async ({ sparql, codePath }) => {
  const client = new StreamClient(sparql)

  return new (class extends ApiBase implements Api {
    constructor() {
      super({ path, codePath, dataset: $rdf.dataset() })
    }

    async init() {
      assertTerm(this.term)

      if (this.initialized) {
        // return
      }

      const apiBase = this.term.value.replace(new RegExp(`${path}$`), '/')
      log('Initializing API %s', this.term.value)

      const apiExists = await store.exists(this.term)
      if (!apiExists) {
        log('API Documentation resource does not exist. Creating...')

        await store.save(apiDocResources.ApiDocumentation(this.term, apiBase))
        await store.save(apiDocResources.Entrypoint(apiBase))
        await store.save(apiDocResources.ClassesCollection(this.term))
        await store.save(apiDocResources.HydraClass())
      }

      const api = await store.load(this.term)

      const resources = await CONSTRUCT`?s ?p ?o. ${this.term} ${hydra.supportedClass} ?c`
        .WHERE`
          GRAPH ?c {
            ?c a ${hydra.Class} .
            ?s ?p ?o .
          }
        `.execute(client.query)
      await api.dataset.import(resources)

      this.dataset = api.dataset
      this.initialized = true
    }
  })()
}

export default createApi

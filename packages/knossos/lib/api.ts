import type { Api } from 'hydra-box/Api'
import { loadLinkedResources } from '@hydrofoil/labyrinth/lib/query/eagerLinks'
import { query } from '@hydrofoil/labyrinth/lib/namespace'
import StreamClient from 'sparql-http-client/StreamClient'
import $rdf from 'rdf-ext'
import { Debugger } from 'debug'
import { DatasetCore, NamedNode, Term } from 'rdf-js'
import { ApiFactory } from '../../labyrinth'
import { ResourceStore } from './store'
import { createApiDocumentation, createClassesCollection } from './apiDocumentation'

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

  return new (class implements Api {
    initialized = false
    path = path
    codePath = codePath
    dataset: DatasetCore = $rdf.dataset()
    term: NamedNode | undefined = undefined

    get graph() {
      return this.term
    }

    async init() {
      assertTerm(this.term)

      if (this.initialized) {
        return
      }

      log('Initializing API %s', this.term.value)

      const apiExists = await store.exists(this.term)
      if (!apiExists) {
        log('API Documentation resource does not exist. Creating...')

        await store.save(createApiDocumentation(this.term))
        await store.save(createClassesCollection(this.term))
      }

      const api = await store.load(this.term)

      api.dataset.addAll([...await loadLinkedResources(api, api.out(query.include).toArray(), client)])

      this.dataset = api.dataset
      this.initialized = true
    }
  })()
}

export default createApi

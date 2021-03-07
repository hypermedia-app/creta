import type { Api } from 'hydra-box/Api'
import $rdf from 'rdf-ext'
import { Debugger } from 'debug'
import { DatasetCore, NamedNode, Term } from 'rdf-js'
import clownface from 'clownface'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import { ApiFactory } from '../../labyrinth'
import { ResourceStore } from './store'

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

const createApi: (arg: ApiFromStore) => ApiFactory = ({ path = '/api', store, log }) => async ({ codePath }) => {
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

        const ptr = clownface({ dataset: $rdf.dataset(), term: this.term })
          .addOut(rdf.type, hydra.ApiDocumentation)

        await store.save(ptr)
      }

      const api = await store.load(this.term)

      this.dataset = api.dataset
      this.initialized = true
    }
  })()
}

export default createApi

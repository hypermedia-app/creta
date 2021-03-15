import type { Api } from 'hydra-box/Api'
import StreamClient from 'sparql-http-client/StreamClient'
import $rdf from 'rdf-ext'
import { Debugger } from 'debug'
import ApiBase from 'hydra-box/Api'
import { NamedNode, Term } from 'rdf-js'
import { ApiFactory } from '@hydrofoil/labyrinth'
import { ResourceStore } from './store'
import * as apiDocResources from './apiDocumentation'
import { CONSTRUCT } from '@tpluscode/sparql-builder'
import { hydra } from '@tpluscode/rdf-ns-builders'
import namespace from '@rdfjs/namespace'

interface ApiFromStore {
  path?: string
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

      const root = namespace(this.term.value.replace(new RegExp(`${path}$`), '/'))
      log?.('Initializing API %s', this.term.value)

      const apiExists = await store.exists(this.term)
      if (!apiExists) {
        log?.('API Documentation resource does not exist. Creating...')

        const namespaces = { api: namespace(this.term.value + '/'), root }

        await Promise.all([
          store.save(apiDocResources.ApiDocumentation(this.term, namespaces)),
          store.save(apiDocResources.Entrypoint(namespaces)),
          store.save(apiDocResources.ClassesCollection(namespaces)),
          store.save(apiDocResources.HydraClass()),
          store.save(apiDocResources.SystemUser(namespaces)),
          ...[...apiDocResources.AclResources(namespaces)].map(store.save.bind(store)),
          ...[...apiDocResources.SystemAuthorizations(namespaces)].map(store.save.bind(store)),
        ])
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

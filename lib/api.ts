import hb from 'hydra-box'
import Api from 'hydra-box/Api'
import type * as api from 'hydra-box/Api'
import {StreamClient} from 'sparql-http-client/StreamClient';
import walk from '@fcostarodrigo/walk'
import { log } from './logger'
import $rdf from 'rdf-ext';
import {CONSTRUCT} from '@tpluscode/sparql-builder';

interface ApiFromFilesystem {
  baseUri: string
  codePath: string
  defaultBase?: string
  apiPath: string
  path?: string
}

export async function fromFilesystem({ apiPath, baseUri, codePath, defaultBase = 'urn:hydra-box:api', path = '/api' }: ApiFromFilesystem): Promise<api.Api> {
  const options: api.ApiInit = {
    path,
    codePath,
  }

  let api: Api | undefined
  for await (const file of walk(apiPath)) {
    if (!file.match(/\.ttl$/)) {
      continue
    }

    log(`Loading api from file ${file}`)
    if (api) {
      api = await api.fromFile(file)
    } else {
      api = await hb.Api.fromFile(file, options)
    }
  }

  if (!api) {
    throw new Error('No API files found')
  }

  api.rebase(defaultBase, baseUri)
  return api
}

interface ApiFromStore {
  sparql: StreamClient
  path?: string
  codePath: string
}

export function fromStore({ sparql, path = '/api', codePath }: ApiFromStore): api.Api {
  return new (class implements api.Api {
    initialized = false
    path = path
    codePath = codePath
    dataset = $rdf.dataset()
    term = undefined

    get graph() {
      return this.term
    }

    async init() {
      if (this.initialized) {
        return
      }

      const apiStream = await CONSTRUCT`?s ?p ?o`
        .FROM(this.graph!)
        .WHERE`?s ?p ?o`
        .execute(sparql.query)

      await this.dataset.import(apiStream)
      this.initialized = true
    }
  })()
}

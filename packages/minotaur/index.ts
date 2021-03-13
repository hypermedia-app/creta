import * as api from 'hydra-box/Api'
import Api from 'hydra-box/Api'
import walk from '@fcostarodrigo/walk'
import { log } from '../labyrinth/lib/logger'
import hb from 'hydra-box'

interface ApiFromFilesystem {
  baseUri: string
  codePath: string
  defaultBase?: string
  apiPath: string
  path?: string
}

export async function fromFilesystem({ apiPath, baseUri, codePath, defaultBase = 'urn:hydra-box:api', path = '/api' }: ApiFromFilesystem): Promise<Api> {
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

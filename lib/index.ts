import * as hb from 'hydra-box'
import type Api from 'hydra-box/Api'
import walk from '@fcostarodrigo/walk'
import { log } from './logger'

interface ApiInit {
  baseUri: string
  codePath: string
  defaultBase?: string
  apiPath: string
}

export async function createApi({ apiPath, baseUri, codePath, defaultBase = 'urn:hydra-box:api' }: ApiInit): Promise<Api> {
  const options: Api.Options = {
    path: '/api',
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

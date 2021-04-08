import Api, { ApiInit } from 'hydra-box/Api'
import walk from '@fcostarodrigo/walk'
import { log } from '../labyrinth/lib/logger'

interface ApiFromFilesystem {
  baseUri: string
  codePath: string
  defaultBase?: string
  apiPath: string
  path?: string
}

export async function fromFilesystem({ apiPath, baseUri, codePath, defaultBase = 'urn:hydra-box:api', path = '/api' }: ApiFromFilesystem): Promise<Api> {
  const options: ApiInit = {
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
      api = await Api.fromFile(file, options)
    }
  }

  if (!api) {
    throw new Error('No API files found')
  }

  api.rebase(defaultBase, baseUri)
  return api
}

/**
 * @packageDocumentation
 * @module @hydrofoil/minotaur
 */

import Api, { ApiInit } from 'hydra-box/Api'
import walk from '@fcostarodrigo/walk'
import { log } from '../labyrinth/lib/logger'

export interface ApiFromFilesystem {
  path?: string
  codePath?: string
  baseUri?: {
    /**
     * The base URI used in the parsed sources
     */
    default: string
    /**
     * The base URI to replace the one parsed. Useful when deploying an API into multiple environments
     */
    replaced: string
  }
  /**
   * Directory from which to load the API Documentation RDF sources
   */
  apiPath: string
}

/**
 * Creates a {@link ApiFactory} function which will recursively load turtle files from {@link apiPath}
 *
 * @param apiPath filesystem path from where to load RDF
 * @param baseUri
 * @param path path to the API resource
 * @param codePath runtime path for relative code modules
 */
export const fromFilesystem = async ({ apiPath, baseUri, path, codePath }: ApiFromFilesystem): Promise<Api> => {
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

  if (baseUri) {
    api.rebase(baseUri.default, baseUri.replaced)
  }
  return api
}

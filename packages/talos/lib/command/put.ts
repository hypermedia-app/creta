import path from 'path'
import * as fs from 'fs'
import $rdf from 'rdf-ext'
import { bootstrap } from '../bootstrap'
import { deleteApi } from '../deleteApi'
import { log } from '../log'
import type { Command } from '.'

export interface Put extends Command {
  api: string
  apiPath?: string
}

export async function put(directories: string[], { token, api, endpoint, updateEndpoint, user, password, apiPath = '/api' }: Put) {
  const apiUri = $rdf.namedNode(`${api}${apiPath}`)
  for (const dir of directories) {
    const cwd = path.resolve(process.cwd(), dir)

    if (!fs.existsSync(cwd)) {
      log('Skipping path %s which does not exist', dir)
      continue
    }
    if (!fs.statSync(cwd).isDirectory()) {
      log('Skipping path %s which is not a directory', dir)
      continue
    }

    await bootstrap({
      api,
      apiUri,
      cwd,
      endpointUrl: endpoint,
      updateUrl: updateEndpoint || endpoint,
      user,
      password,
    })
  }

  await deleteApi({ apiUri, token })
}

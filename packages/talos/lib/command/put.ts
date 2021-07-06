import path from 'path'
import $rdf from 'rdf-ext'
import { bootstrap } from '../bootstrap'
import { deleteApi } from '../deleteApi'
import type { Command } from '.'

interface Put extends Command {
  api: string
  apiPath?: string
}

export async function put(directories: string[], { token, api, endpoint, user, password, apiPath }: Put) {
  const apiUri = $rdf.namedNode(`${api}${apiPath}`)
  for (const dir of directories) {
    const cwd = path.resolve(process.cwd(), dir)

    await bootstrap({
      api,
      apiUri,
      cwd,
      endpointUrl: endpoint,
      updateUrl: endpoint,
      user,
      password,
    })
  }

  await deleteApi({ apiUri, token })
}

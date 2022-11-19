import $rdf from 'rdf-ext'
import { ResourcePerGraphStore } from '@hydrofoil/knossos/lib/store'
import StreamClient from 'sparql-http-client'
import { bootstrap } from '../bootstrap'
import { deleteApi } from '../deleteApi'
import { fromDirectories } from '../resources'
import type { Command } from '.'

export interface Put extends Command {
  api: string
  apiPath?: string
}

export async function put(directories: string[], { token, api, endpoint, updateEndpoint, user, password, apiPath = '/api' }: Put) {
  const apiUri = $rdf.namedNode(`${api}${apiPath}`)

  const dataset = await fromDirectories(directories, api)

  await bootstrap({
    dataset,
    apiUri,
    store: new ResourcePerGraphStore(new StreamClient({
      endpointUrl: endpoint,
      updateUrl: updateEndpoint || endpoint,
      user,
      password,
    })),
  })

  await deleteApi({ apiUri, token })
}

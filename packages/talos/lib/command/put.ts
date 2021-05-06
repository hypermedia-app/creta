import path from 'path'
import debug, { Debugger } from 'debug'
import fetch from 'node-fetch'
import { insertVocabs } from '../insertVocabs'
import { bootstrap } from '../bootstrap'

interface Put {
  api: string
  endpoint: string
  user?: string
  password?: string
  dir: string
  vocabs?: boolean
  resources?: boolean
  token?: string
  apiPath?: string
}

async function insertResources({ dir, token, api, endpoint, user, password, apiPath }: Put, log: Debugger) {
  const cwd = path.resolve(process.cwd(), dir)

  await bootstrap({
    log,
    api,
    cwd,
    endpointUrl: endpoint,
    updateUrl: endpoint,
    user,
    password,
  })

  if (token) {
    const res = await fetch(`${api}${apiPath}`, {
      method: 'DELETE',
      headers: {
        Authorization: `System ${token}`,
      },
    })

    if (res.ok) {
      log('Reset hydra:ApiDocumentation')
    } else {
      log('Failed to reset hydra:ApiDocumentation: %s', await res.text())
    }
  } else {
    log('No System token provided. API restart may be necessary for changes to be applied')
  }
}

export async function put(arg: Put): Promise<number> {
  const log = debug('talos')
  log.enabled = true

  let inserted = false

  if (arg.vocabs) {
    inserted = true
    await insertVocabs({
      endpointUrl: arg.endpoint,
      updateUrl: arg.endpoint,
      user: arg.user,
      password: arg.password,
    }).then(() => log('Inserted vocabularies'))
  }

  if (arg.resources) {
    inserted = true
    await insertResources(arg, log)
  }

  if (!inserted) {
    log('Nothing selected for bootstrapping. Please check --help option')
    return -1
  }

  return 0
}

import debug from 'debug'
import importCwd from 'import-cwd'
import * as server from '../../server'

interface Options {
  port: number
  api: string
  base?: string
  codePath: string
  updateUrl?: string
  name: string
  user?: string
  password?: string
  authModule?: string
}

export async function serve(endpointUrl: string, options: Options): Promise<void> {
  const {
    name,
    api,
    authModule,
    updateUrl,
  } = options
  const log = debug(name)

  log('Settings %O', {
    ...options,
    workingDir: process.cwd(),
  })

  let authentication: any
  if (authModule) {
    authentication = importCwd.silent(authModule)
    if (!authentication) {
      log(`Module ${authModule} not found relative to ${process.cwd()}`)
    }
  }

  return server.serve({
    ...options,
    path: api,
    log,
    endpointUrl,
    updateUrl,
    middleware: {
      authentication: authentication?.default,
    },
  }).catch(log.extend('error'))
}

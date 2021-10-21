import debug from 'debug'
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
}

export async function serve(endpointUrl: string, options: Options): Promise<void> {
  const {
    name,
    api,
    updateUrl,
  } = options
  const log = debug(name)

  log('Settings %O', {
    ...options,
    workingDir: process.cwd(),
  })

  return server.serve({
    ...options,
    path: api,
    log,
    endpointUrl,
    updateUrl,
  }).catch(log.extend('error'))
}

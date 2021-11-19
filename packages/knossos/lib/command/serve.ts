import debug from 'debug'
import express from 'express'
import knossos from '../..'

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

export function serve(endpointUrl: string, options: Options): void {
  const {
    port,
    name,
    api,
    updateUrl,
  } = options
  const log = debug(name)

  log('Settings %O', {
    ...options,
    workingDir: process.cwd(),
  })

  try {
    const app = express()
    app.enable('trust proxy')

    app.use(knossos({
      ...options,
      path: api,
      endpointUrl,
      updateUrl,
    }))

    app.listen(port, () => log(`${name} started`))
  } catch (e) {
    log.extend('error')(e)
  }
}

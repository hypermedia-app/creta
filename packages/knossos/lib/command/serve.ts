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
  routeRegex?: string
}

export function serve(endpointUrl: string, options: Options): void {
  const {
    port,
    name,
    api,
    updateUrl,
    routeRegex,
  } = options
  const log = debug(name)

  log('Settings %O', {
    ...options,
    workingDir: process.cwd(),
  })

  try {
    const app = express()
    app.enable('trust proxy')

    const knossosHandler = knossos({
      ...options,
      path: api,
      endpointUrl,
      updateUrl,
    })

    if (routeRegex) {
      app.use(new RegExp(routeRegex), knossosHandler)
    } else {
      app.use(knossosHandler)
    }

    app.listen(port, () => log(`${name} started`))
  } catch (e) {
    log.extend('error')(e)
  }
}

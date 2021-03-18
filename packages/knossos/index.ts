#!/usr/bin/env node
import Program from 'commander'
import debug from 'debug'
import importCwd from 'import-cwd'
import { serve } from './server'
import { bootstrap } from './lib/bootstrap'

Program.command('serve <endpoint>')
  .option('-p, --port <port>', 'Port', value => parseInt(value), 8888)
  .option('--api <api>', 'Api Documentation path', '/api')
  .option('--codePath <codePath>', 'Code path for hydra-box', '.')
  .option('--updateUrl <updateUrl>', 'SPARQL Update Endpoint URL')
  .option('-n, --name <name>', 'App name', 'knossos')
  .option('--authModule <authModule>', 'Authentication module', 'Must default-export an express handler factory. Can be lazy.')
  .action(async (endpointUrl, options) => {
    const {
      updateUrl,
      name,
      port,
      codePath,
      api,
      authModule,
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

    return serve({
      name,
      path: api,
      port,
      log,
      endpointUrl,
      updateUrl,
      codePath,
      middleware: {
        authentication: authentication?.default,
      },
    }).catch(log.extend('error'))
  })

Program.command('init [patterns...]')
  .requiredOption('--endpoint <endpoint>')
  .option('-u, --user <user>')
  .option('--overwrite')
  .option('-p, --password <password>')
  .requiredOption('--api <api>')
  .action((patterns, { api, endpoint, user, password, overwrite }) => {
    const log = debug('knossos')
    log.enabled = true

    log(`Bootstrapping resources for api ${api}`)

    return bootstrap({
      log,
      api,
      patterns: patterns.length ? patterns : ['**/*.ttl'],
      endpointUrl: endpoint,
      updateUrl: endpoint,
      user,
      password,
      overwrite,
    }).then(() => log('Done!'))
  })

Program.parse(process.argv)

import Program from 'commander'
import debug from 'debug'
import importCwd from 'import-cwd'
import { serve } from './server'
import { copyResources } from './lib/init'

Program.command('serve <endpoint>')
  .option('-p, --port <port>', 'Port', value => parseInt(value), 8888)
  .option('--api <api>', 'Api Documentation path', '/api')
  .option('--codePath <codePath>', 'Code path for hydra-box', '.')
  .option('--updateUrl <updateUrl>', 'SPARQL Update Endpoint URL')
  .option('-n, --name <name>', 'App name', 'knossos')
  .option('--user <user>', 'SPARQL username')
  .option('--password <password>', 'SPARQL password')
  .option('--authModule <authModule>', 'Authentication module', 'Must default-export an express handler factory. Can be lazy.')
  .action(async (endpointUrl, options) => {
    const {
      name,
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
      ...options,
      path: api,
      log,
      endpointUrl,
      middleware: {
        authentication: authentication?.default,
      },
    }).catch(log.extend('error'))
  })

Program.command('init').action(copyResources)

Program.parse(process.argv)

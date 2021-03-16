import Program from 'commander'
import debug from 'debug'
import { serve } from './server'
import { bootstrap } from './lib/bootstrap'

Program.command('serve <endpoint>')
  .option('-p, --port <port>', 'Port', value => parseInt(value), 8888)
  .option('--api <api>', 'Api Documentation path', '/api')
  .option('--codePath <codePath>', 'Code path for hydra-box', '.')
  .option('--updateUrl <updateUrl>', 'SPARQL Update Endpoint URL')
  .option('-n, --name <name>', 'App name', 'knossos')
  .action((endpointUrl, options) => {
    const {
      updateUrl,
      name,
      port,
      codePath,
      api,
    } = options
    const log = debug(name)

    log('%O', options)

    return serve({
      name,
      path: api,
      port,
      log,
      endpointUrl,
      updateUrl,
      codePath,
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

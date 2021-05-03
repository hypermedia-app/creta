import Program from 'commander'
import { init, serve } from './lib/command'

Program.command('serve <endpoint>')
  .option('-p, --port <port>', 'Port', value => parseInt(value), 8888)
  .option('--api <api>', 'Api Documentation path', '/api')
  .option('--base')
  .option('--codePath <codePath>', 'Code path for hydra-box', '.')
  .option('--updateUrl <updateUrl>', 'SPARQL Update Endpoint URL')
  .option('-n, --name <name>', 'App name', 'knossos')
  .option('--user <user>', 'SPARQL username')
  .option('--password <password>', 'SPARQL password')
  .option('--authModule <authModule>', 'Authentication module. Must default-export an express handler factory. Can be lazy.')
  .action(serve)

Program.command('init').action(init)

Program.parse(process.argv)

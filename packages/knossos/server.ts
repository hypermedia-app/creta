import { program } from 'commander'
import { init, serve } from './lib/command'

program.command('serve <endpoint>')
  .option('-p, --port <port>', 'Port', value => parseInt(value), 8888)
  .option('--api <api>', 'Api Documentation path', '/api')
  .option('--base')
  .option('--codePath <codePath>', 'Code path for hydra-box', '.')
  .option('--updateUrl <updateUrl>', 'SPARQL Update Endpoint URL')
  .option('-n, --name <name>', 'App name', 'knossos')
  .option('--user <user>', 'SPARQL username')
  .option('--password <password>', 'SPARQL password')
  .option('--routePath <routePath>', 'Base path pattern used to prefix the knossos middleware')
  .action(serve)

program.command('init')
  .description('Populates the initial directory structure of resource files in turtle format')
  .argument('[packages...]', 'Additional package names to source initial resources')
  .action(async (packages) => {
    const result = await init({
      dest: process.cwd(),
      paths: [
        __dirname,
      ],
      packages,
    })

    process.exit(result)
  })

program.parse(process.argv)

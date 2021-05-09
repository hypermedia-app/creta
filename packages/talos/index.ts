import Program from 'commander'
import { put } from './lib/command'

Program.command('put')
  .description('Initializes the database from local resource files')
  .requiredOption('--api <api>')
  .requiredOption('--endpoint <endpoint>')
  .option('--vocabs', 'Insert required vocabularies to store', false)
  .option('--resources', 'Insert resources', false)
  .option('--token <token>', 'System authentication token')
  .option('-u, --user <user>')
  .option('-p, --password <password>')
  .option('-d, --dir <dir>', 'Directory with resource to bootstrap', './resources')
  .option('--apiPath <apiPath>', 'The path of the API Documentation resource', '/api')
  .action(async (arg) => {
    process.exit(await put(arg))
  })

Program.parse(process.argv)

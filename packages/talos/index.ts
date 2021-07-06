import Program from 'commander'
import { put, putVocabs } from './lib/command'
import { parseExtraVocabs } from './lib/command/extraVocabs'
import { log } from './lib/log'

Program.command('put [dirs...]')
  .description('Initializes the database from local resource files')
  .requiredOption('--api <api>')
  .requiredOption('--endpoint <endpoint>')
  .option('--token <token>', 'System authentication token')
  .option('-u, --user <user>')
  .option('-p, --password <password>')
  .option('--apiPath <apiPath>', 'The path of the API Documentation resource', '/api')
  .action(async (dirs, arg) => {
    put(dirs.length ? dirs : ['./resources'], arg)
      .catch((e) => {
        log(e)
        process.exit(1)
      })
  })

Program.command('put-vocabs')
  .description('Inserts vocabulary graphs into the database')
  .requiredOption('--apiDoc <apiDoc>')
  .requiredOption('--endpoint <endpoint>')
  .option('--token <token>', 'System authentication token')
  .option('-u, --user <user>')
  .option('-p, --password <password>')
  .option('--extraVocabs <...extraVocab>', 'Package name and (optionally) comma-separated prefixes', parseExtraVocabs)
  .action((arg) => {
    putVocabs(arg)
      .catch((e) => {
        log(e)
        process.exit(1)
      })
  })

Program.parse(process.argv)

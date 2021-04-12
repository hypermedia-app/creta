import path from 'path'
import Program from 'commander'
import debug from 'debug'
import fetch from 'node-fetch'
import { bootstrap } from './lib/bootstrap'
import { insertVocabs } from './lib/insertVocabs'
import { insertSystemAcl } from './lib/systemAcl'

Program.command('put')
  .requiredOption('--api <api>')
  .requiredOption('--endpoint <endpoint>')
  .option('--vocabs', 'Insert required vocabularies to store')
  .option('--acl', 'Insert system account ACL')
  .option('--resources', 'Insert resources')
  .option('--token <token>', 'System authentication token')
  .option('-u, --user <user>')
  .option('-p, --password <password>')
  .option('-d, --dir <dir>', 'Directory with resource to bootstrap', './resources')
  .action(async ({ api, endpoint, user, password, dir, vocabs, acl, resources, token }) => {
    const log = debug('talos')
    log.enabled = true

    let inserted = false

    if (vocabs) {
      inserted = true
      await insertVocabs({
        endpointUrl: endpoint,
        updateUrl: endpoint,
        user,
        password,
      }).then(() => log('Inserted vocabularies'))
    }

    if (acl) {
      inserted = true
      await insertSystemAcl({
        api,
        endpointUrl: endpoint,
        updateUrl: endpoint,
        user,
        password,
      }).then(() => log('Inserted system account acl:Authorization'))
    }

    if (resources) {
      inserted = true
      const cwd = path.resolve(process.cwd(), dir)

      await bootstrap({
        log,
        api,
        cwd,
        endpointUrl: endpoint,
        updateUrl: endpoint,
        user,
        password,
      })

      if (token) {
        const res = await fetch(`${api}/api`, {
          method: 'DELETE',
          headers: {
            Authorization: `System ${token}`,
          },
        })

        if (res.ok) {
          log('Reset hydra:ApiDocumentation')
        } else {
          log('Failed to reset hydra:ApiDocumentation: %s', await res.text())
        }
      }
    }

    if (!inserted) {
      log('Nothing selected for bootstrapping. Please check --help option')
    }
  })

Program.parse(process.argv)

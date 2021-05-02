import { NamedNode } from 'rdf-js'
import * as path from 'path'
import { put } from 'talos/lib/command/put'
import { ASK, DELETE, SELECT } from '@tpluscode/sparql-builder'
import ParsingClient from 'sparql-http-client/ParsingClient'
import { expect } from 'chai'
import { acl, as, hydra, rdfs, schema } from '@tpluscode/rdf-ns-builders'
import namespace from '@rdfjs/namespace'

const api = 'http://example.com/base'
const ns = namespace(api + '/')

describe('@hydrofoil/talos/lib/command/put', () => {
  const params: Parameters<typeof put>[0] = {
    api,
    dir: path.resolve(__dirname, '../../resources'),
    endpoint: 'http://db.labyrinth.lndo.site/repositories/tests',
    user: 'minos',
    password: 'password',
  }

  const client = new ParsingClient({
    endpointUrl: 'http://db.labyrinth.lndo.site/repositories/tests',
    updateUrl: 'http://db.labyrinth.lndo.site/repositories/tests',
    user: 'minos',
    password: 'password',
  })

  before(async () => {
    await DELETE`?s ?p ?o`.WHERE`?s ?p ?o`.execute(client.query)
  })

  describe('--vocabs', () => {
    before(async () => {
      await put({
        ...params,
        vocabs: true,
      })
    })

    const vocabs: Array<[string, NamedNode]> = [
      ['hydra', hydra()],
      ['acl', acl()],
      ['as', as()],
      ['rdfs', rdfs()],
    ]

    for (const [prefix, namespace] of vocabs) {
      it(`inserts ${prefix} into graph ${namespace.value}`, async () => {
        const results = await SELECT`(count(*) as ?count)`
          .WHERE`?s ?p ?o`
          .FROM(namespace).execute(client.query)

        expect(parseInt(results[0].count.value)).to.be.greaterThan(0)
      })
    }
  })

  describe('resources', () => {
    before(async () => {
      await put({
        ...params,
        resources: true,
      })
    })

    describe('turtle', () => {
      it('inserts into graph constructed from path', () => {
        const userCreated = ASK`${ns('project/creta/user/tpluscode')} a ${schema.Person}`
          .FROM(ns('project/creta/user/tpluscode'))
          .execute(client.query)

        expect(userCreated).to.eventually.be.true
      })
    })
  })
})

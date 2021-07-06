import { NamedNode } from 'rdf-js'
import { putVocabs, PutVocabs } from 'talos/lib/command/put-vocabs'
import ParsingClient from 'sparql-http-client/ParsingClient'
import { ASK, DELETE, SELECT } from '@tpluscode/sparql-builder'
import { acl, as, hydra, rdfs } from '@tpluscode/rdf-ns-builders'
import { expect } from 'chai'
import * as wikibusVocabs from '@wikibus/vocabularies/builders/strict'

describe('@hydrofoil/talos/lib/command/put-vocabs', () => {
  const params: PutVocabs = {
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

  describe('--', () => {
    before(async () => {
      await putVocabs(params)
    })

    const vocabs: Array<[string, NamedNode]> = [
      ['hydra', hydra()],
      ['acl', acl()],
      ['as', as()],
      ['rdfs', rdfs()],
      ['rdf', rdfs()],
      ['sh', rdfs()],
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

  describe('--extraVocab', () => {
    const vocabs = Object.values(wikibusVocabs).map((ns) => ns())

    beforeEach(async () => {
      await DELETE`?s ?p ?o`.WHERE`?s ?p ?o`.execute(client.query)
    })

    it('inserts all vocabs when no specific prefixes selected', async () => {
      // when
      await putVocabs({
        ...params,
        extraVocabs: [{
          package: '@wikibus/vocabularies',
        }],
      })

      // then
      for (const namespace of vocabs) {
        const results = await SELECT`(count(*) as ?count)`
          .WHERE`?s ?p ?o`
          .FROM(namespace).execute(client.query)

        expect(parseInt(results[0].count.value)).to.be.greaterThan(0)
      }
    })

    it('inserts specific vocabs', async () => {
      // when
      await putVocabs({
        ...params,
        extraVocabs: [{
          package: '@wikibus/vocabularies',
          prefixes: ['wba'],
        }],
      })

      // then
      const hasWba = await ASK`?s ?p ?o`.FROM(wikibusVocabs.wba()).execute(client.query)
      expect(hasWba).to.be.true

      const hasOther = await ASK`?s ?p ?o`
        .FROM(wikibusVocabs.wbo()).FROM(wikibusVocabs.wb_events())
        .execute(client.query)
      expect(hasOther).to.be.false
    })
  })
})

import { NamedNode } from 'rdf-js'
import * as path from 'path'
import { put } from 'talos/lib/command/put'
import { ASK, DELETE, SELECT } from '@tpluscode/sparql-builder'
import ParsingClient from 'sparql-http-client/ParsingClient'
import { expect } from 'chai'
import { acl, as, doap, hydra, rdfs, schema } from '@tpluscode/rdf-ns-builders'
import * as wikibusVocabs from '@wikibus/vocabularies/builders/strict'
import namespace from '@rdfjs/namespace'
import * as NodeFetch from 'node-fetch'
import sinon from 'sinon'

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

  describe('--vocabs --extraVocab', () => {
    const vocabs = Object.values(wikibusVocabs).map((ns) => ns())

    beforeEach(async () => {
      await DELETE`?s ?p ?o`.WHERE`?s ?p ?o`.execute(client.query)
    })

    it('inserts all vocabs when no specific prefixes selected', async () => {
      // when
      await put({
        ...params,
        vocabs: true,
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
      await put({
        ...params,
        vocabs: true,
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

  describe('--resources', () => {
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

      it('adds apiDocumentation link', () => {
        const userCreated = ASK`${ns('project/creta/user/tpluscode')} ${hydra.apiDocumentation} ?api`
          .FROM(ns('project/creta/user/tpluscode'))
          .execute(client.query)

        expect(userCreated).to.eventually.be.true
      })
    })

    describe('n-quads', () => {
      it('inserts into graph constructed from path', () => {
        const userCreated = ASK`${ns('project/creta/project/creta')} a ${doap.Project}`
          .FROM(ns('project/creta/project/creta'))
          .execute(client.query)

        expect(userCreated).to.eventually.be.true
      })
    })
  })

  describe('--resources --token', () => {
    let fetch: sinon.SinonStub

    before(async () => {
      fetch = sinon.stub(NodeFetch, 'default').resolves({
        ok: true,
      } as any)

      await put({
        ...params,
        resources: true,
        token: 'foo-bar',
        apiPath: '/da-api',
      })
    })

    afterEach(() => {
      sinon.restore()
    })

    it('requests DELETE of ApiDocumentation', () => {
      // expect
      expect(fetch).to.have.been.calledWith('http://example.com/base/da-api', sinon.match({
        method: 'DELETE',
        headers: {
          Authorization: sinon.match(/^System .+/),
        },
      }))
    })
  })

  it('returns error = -1 when no switch was given', async () => {
    // when
    const result = await put({
      ...params,
    })

    // then
    expect(result).to.eq(-1)
  })
})

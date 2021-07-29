import * as path from 'path'
import { put, Put } from 'talos/lib/command/put'
import { ASK, DELETE } from '@tpluscode/sparql-builder'
import ParsingClient from 'sparql-http-client/ParsingClient'
import { expect } from 'chai'
import { doap, hydra, schema } from '@tpluscode/rdf-ns-builders'
import namespace from '@rdfjs/namespace'
import * as NodeFetch from 'node-fetch'
import sinon from 'sinon'

const api = 'http://example.com/base'
const ns = namespace(api + '/')
const dir = path.resolve(__dirname, '../../resources')

describe('@hydrofoil/talos/lib/command/put', () => {
  const params: Put = {
    api,
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

  describe('--resources', () => {
    before(async () => {
      await put([dir], params)
    })

    describe('turtle', () => {
      it('inserts into graph constructed from path', () => {
        const userCreated = ASK`${ns('project/creta/user/tpluscode')} a ${schema.Person}`
          .FROM(ns('project/creta/user/tpluscode'))
          .execute(client.query)

        expect(userCreated).to.eventually.be.true
      })

      it('escapes paths to produce valid URIs', () => {
        const userCreated = ASK`${ns('project/creta/user/Kov%C3%A1cs%20J%C3%A1nos')} a ${schema.Person}`
          .FROM(ns('project/creta/user/Kov%C3%A1cs%20J%C3%A1nos'))
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

      await put([dir], {
        ...params,
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
})

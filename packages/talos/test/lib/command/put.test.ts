import * as path from 'path'
import { put, Put } from 'talos/lib/command/put'
import { ASK, DELETE, SELECT } from '@tpluscode/sparql-builder'
import ParsingClient from 'sparql-http-client/ParsingClient'
import { expect } from 'chai'
import { doap, hydra, schema, vcard } from '@tpluscode/rdf-ns-builders'
import namespace from '@rdfjs/namespace'
import * as NodeFetch from 'node-fetch'
import sinon from 'sinon'

const apis = [
  'http://example.com',
  'http://example.com/base',
]
const dir = path.resolve(__dirname, '../../resources')

for (const api of apis) {
  const ns = namespace(api + '/')

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

    it('ignores paths which do not exist', async () => {
      await expect(put([path.resolve(__dirname, '../../foobar')], params)).not.to.have.been.rejected
    })

    it('ignores paths which are not directories', async () => {
      await expect(put([path.resolve(__dirname, './put.test.ts')], params)).not.to.have.been.rejected
    })

    describe(`--resources api ${api}`, () => {
      before(async () => {
        await put([dir], params)
      })

      describe('turtle', () => {
        it('inserts into graph constructed from path', async () => {
          const userCreated = ASK`${ns('project/creta/user/tpluscode')} a ${schema.Person}`
            .FROM(ns('project/creta/user/tpluscode'))
            .execute(client.query)

          await expect(userCreated).to.eventually.be.true
        })

        it('escapes paths to produce valid URIs', async () => {
          const userCreated = ASK`${ns('project/creta/user/Kov%C3%A1cs%20J%C3%A1nos')} a ${schema.Person}`
            .FROM(ns('project/creta/user/Kov%C3%A1cs%20J%C3%A1nos'))
            .execute(client.query)

          await expect(userCreated).to.eventually.be.true
        })

        it('allows dots in paths', async () => {
          const userCreated = ASK`${ns('project/creta/user.group/john.doe')} a ${vcard.Group}`
            .FROM(ns('project/creta/user.group/john.doe'))
            .execute(client.query)

          await expect(userCreated).to.eventually.be.true
        })

        it('adds apiDocumentation link', async () => {
          const [{ api }] = await SELECT`?api`.WHERE`${ns('project/creta/user/tpluscode')} ${hydra.apiDocumentation} ?api`
            .FROM(ns('project/creta/user/tpluscode'))
            .execute(client.query)

          expect(api).to.deep.eq(ns('api'))
        })

        it('correctly applies relative URIs to base paths', async () => {
          const hasExpectedLinks = ASK`
            ${ns('project/creta/user/tpluscode')} 
              ${schema.knows} ${ns('project/creta/user/Kov%C3%A1cs%20J%C3%A1nos')} ;
              ${schema.project} ${ns('project/creta/project/creta')} 
          `
            .FROM(ns('project/creta/user/tpluscode'))
            .execute(client.query)

          await expect(hasExpectedLinks).to.eventually.be.true
        })

        it('correctly applies absolute URIs to base paths', async () => {
          const hasExpectedType = ASK`
            ${ns('project/creta/user/tpluscode')} a ${ns('api/Person')}
          `
            .FROM(ns('project/creta/user/tpluscode'))
            .execute(client.query)

          await expect(hasExpectedType).to.eventually.be.true
        })
      })

      describe('n-quads', () => {
        it('inserts into graph constructed from path', async () => {
          const userCreated = ASK`${ns('project/creta/project/creta')} a ${doap.Project}`
            .FROM(ns('project/creta/project/creta'))
            .execute(client.query)

          await expect(userCreated).to.eventually.be.true
        })

        it('correctly applies absolute URIs to base paths', async () => {
          const hasExpectedType = ASK`
            ${ns('project/creta/project/creta')} ${schema.related} ${ns('project/roadshow')}
          `
            .FROM(ns('project/creta/project/creta'))
            .execute(client.query)

          await expect(hasExpectedType).to.eventually.be.true
        })
      })

      describe('JSON-LD', () => {
        it('correctly applies absolute URIs to base paths', async () => {
          const hasExpectedType = ASK`
            ${ns('project/roadshow')} ${schema.related} ${ns('project/creta')}
          `
            .FROM(ns('project/roadshow'))
            .execute(client.query)

          await expect(hasExpectedType).to.eventually.be.true
        })
      })

      describe('n-triples', () => {
        it('correctly applies absolute URIs to base paths', async () => {
          const hasExpectedType = ASK`
            ${ns('project/shaperone')} ${schema.related} ${ns('project/roadshow')}
          `
            .FROM(ns('project/shaperone'))
            .execute(client.query)

          await expect(hasExpectedType).to.eventually.be.true
        })
      })
    })
  })
}

describe('@hydrofoil/talos/lib/command/put --resources --token', () => {
  const fetch = sinon.stub(NodeFetch, 'default').resolves({
    ok: true,
  } as any)

  const params: Put = {
    api: 'http://example.com',
    endpoint: 'http://db.labyrinth.lndo.site/repositories/tests',
    user: 'minos',
    password: 'password',
  }

  before(async () => {
    await put([dir], {
      ...params,
      token: 'foo-bar',
    })
  })

  after(() => {
    sinon.restore()
  })

  it('requests DELETE of ApiDocumentation', () => {
    // expect
    expect(fetch).to.have.been.calledWith('http://example.com/api', sinon.match({
      method: 'DELETE',
      headers: {
        Authorization: sinon.match(/^System foo-bar/),
      },
    }))
  })
})

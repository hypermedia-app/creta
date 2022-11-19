import * as path from 'path'
import { put, Put } from 'talos/lib/command/put'
import { ASK, CONSTRUCT, DELETE, SELECT } from '@tpluscode/sparql-builder'
import ParsingClient from 'sparql-http-client/ParsingClient'
import { expect } from 'chai'
import { dash, doap, hydra, schema, vcard, sh, foaf } from '@tpluscode/rdf-ns-builders/loose'
import namespace from '@rdfjs/namespace'
import * as NodeFetch from 'node-fetch'
import sinon from 'sinon'
import $rdf from 'rdf-ext'
import { testData } from '@labyrinth/testing/client'

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

      await testData`          
        GRAPH ${ns('project/creta/user.group/admins')} {
          ${ns('project/creta/user.group/admins')} ${vcard.hasMember} ${ns('project/creta/user/tpluscode')}
        }

        GRAPH ${ns('project')} {
          ${ns('project')} ${schema.name} "DELETE" .
        }
      `
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

      context('turtle', () => {
        it('replaces entire graph by default', async function () {
          const dataset = $rdf.dataset().addAll(await CONSTRUCT`?s ?p ?o`
            .FROM(ns('project'))
            .WHERE`?s ?p ?o`
            .execute(client.query))

          expect(dataset.toCanonical()).to.matchSnapshot(this)
        })

        it('merge existing graph when annotated', async function () {
          const dataset = $rdf.dataset().addAll(await CONSTRUCT`?s ?p ?o`
            .FROM(ns('project/creta/user.group/admins'))
            .WHERE`?s ?p ?o`
            .execute(client.query))

          expect(dataset.toCanonical()).to.matchSnapshot(this)
        })

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

        it('leaves angle brackets inside single line string literals intact', async () => {
          const [{ value }] = await SELECT`?value`.WHERE`
            ${ns('project/creta/shape')} ${sh.property} ?property .
            
            ?property ${sh.name} "single" ;
                      ${sh.values}/${dash.js} ?value ;
            .
          `
            .FROM(ns('project/creta/shape'))
            .execute(client.query)

          expect(value.value).to.eq('<span>single line template</span>')
        })

        it('leaves angle brackets inside multi line string literals intact', async () => {
          const [{ value }] = await SELECT`?value`.WHERE`
            ${ns('project/creta/shape')} ${sh.property} ?property .
            
            ?property ${sh.name} "multi" ;
                      ${sh.values}/${dash.js} ?value ;
            .
          `
            .FROM(ns('project/creta/shape'))
            .execute(client.query)

          expect(value.value).to.eq(`<span>
multi
line
template
</span>
`)
        })

        it('handles index.ttl file as parent path', async () => {
          const indexCorrectlyInserted = ASK`
            ${ns('project')} a ${schema.Thing}
          `
            .FROM(ns('project'))
            .execute(client.query)

          await expect(indexCorrectlyInserted).to.eventually.be.true
        })

        it('does not generated trailing slash for root handles index.ttl', async () => {
          const indexCorrectlyInserted = ASK`
            ${$rdf.namedNode(api)} a ${schema.Thing}
          `
            .FROM($rdf.namedNode(api))
            .execute(client.query)

          await expect(indexCorrectlyInserted).to.eventually.be.true
        })

        it('removes trailing slash from relative paths resulting in root URI', async () => {
          const indexCorrectlyInserted = ASK`
            ${ns('project')} ${schema.parentItem} <${api}>
          `
            .FROM(ns('project'))
            .execute(client.query)

          await expect(indexCorrectlyInserted).to.eventually.be.true
        })

        it('preserves trailing slash if present in path', async () => {
          const indexCorrectlyInserted = ASK`
            ${ns('project/creta/user/tpluscode')} ${schema.parentItem} ${ns('project/creta/')}
          `
            .FROM(ns('project/creta/user/tpluscode'))
            .execute(client.query)

          await expect(indexCorrectlyInserted).to.eventually.be.true
        })

        it('merges with existing resource representation when option is set', async () => {
          const group = ns('project/creta/user.group/admins')

          const indexCorrectlyInserted = ASK`
            ${group} ${vcard.n} "Administrators" .
            ${group} ${vcard.hasMember} ${ns('project/creta/user/tpluscode')} .
          `
            .FROM(group)
            .execute(client.query)

          await expect(indexCorrectlyInserted).to.eventually.be.true
        })
      })

      context('n-quads', () => {
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

      context('JSON-LD', () => {
        it('correctly applies absolute URIs to base paths', async () => {
          const hasExpectedType = ASK`
            ${ns('project/roadshow')} ${schema.related} ${ns('project/creta')}
          `
            .FROM(ns('project/roadshow'))
            .execute(client.query)

          await expect(hasExpectedType).to.eventually.be.true
        })
      })

      context('n-triples', () => {
        it('correctly applies absolute URIs to base paths', async () => {
          const hasExpectedType = ASK`
            ${ns('project/shaperone')} ${schema.related} ${ns('project/roadshow')}, ${ns('project/creta')}
          `
            .FROM(ns('project/shaperone'))
            .execute(client.query)

          await expect(hasExpectedType).to.eventually.be.true
        })
      })

      context('trig', () => {
        it('inserts into graphs constructed from path', async () => {
          const results = await SELECT`?resource ?graph ?type`
            .WHERE`
              graph ?graph {
                ?resource <http://www.w3.org/ns/earl#test> "trig" ; a ?type
              }
            `
            .execute(client.query)

          expect(results).to.deep.contain.members([{
            resource: ns('trig/users'),
            graph: ns('trig/users'),
            type: hydra.Collection,
          }, {
            resource: ns('trig/users/john-doe'),
            graph: ns('trig/users/john-doe'),
            type: foaf.Person,
          }, {
            resource: ns('trig/users/jane-doe'),
            graph: ns('trig/users/jane-doe'),
            type: foaf.Person,
          }])
        })
      })
    })

    context('with multiple directories', () => {
      before(async () => {
        const fooDir = path.resolve(__dirname, '../../resources.foo')
        const barDir = path.resolve(__dirname, '../../resources.bar')

        await put([dir, fooDir, barDir], params)
      })

      it('merges statements from multiple graph documents', async () => {
        const ask = ASK`
          <${api}>
            ${schema.name} "Bar environment" ;
            ${schema.hasPart} [
              ${schema.minValue} 10 ;
              ${schema.maxValue} 100 ;
            ] ;
          .
        `

        await expect(ask.execute(client.query)).to.eventually.be.true
      })

      it('merges statements from multiple dataset documents', async () => {
        const ask = ASK`
          ${ns('trig/users/jane-doe')}
            a ${foaf.Person} ;
            ${foaf.name} "Jane Doe" ;
          .
        `.execute(client.query)

        await expect(ask).to.eventually.be.true
      })

      it('merges statements from a mix of dataset and graph documents', async () => {
        const ask = ASK`
          ${ns('trig/users/john-doe')}
            a ${foaf.Person} ;
            ${foaf.name} "John Doe" ;
          .
        `.execute(client.query)

        await expect(ask).to.eventually.be.true
      })
    })
  })
}

describe('@hydrofoil/talos/lib/command/put --resources --token', () => {
  let fetch: sinon.SinonStub

  const params: Put = {
    api: 'http://example.com',
    endpoint: 'http://db.labyrinth.lndo.site/repositories/tests',
    user: 'minos',
    password: 'password',
  }

  before(async () => {
    fetch = sinon.stub(NodeFetch, 'default').resolves({
      ok: true,
    } as any)
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

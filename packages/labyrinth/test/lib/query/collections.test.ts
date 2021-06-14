import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import cf from 'clownface'
import $rdf from 'rdf-ext'
import { hydra, rdf, schema } from '@tpluscode/rdf-ns-builders'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import { SELECT } from '@tpluscode/sparql-builder'
import * as Hydra from '@rdfine/hydra'
import RdfResource from '@tpluscode/rdfine'
import { hyper_query } from '@hydrofoil/vocabularies/builders/strict'
import { fromPointer } from '@rdfine/hydra/lib/IriTemplate'
import { ex } from '@labyrinth/testing/namespace'
import '@labyrinth/testing/sparql'
import { api } from '@labyrinth/testing/hydra-box'
import { shrink } from '@zazuko/rdf-vocabularies'
import { StreamClient } from 'sparql-http-client/StreamClient'
import sinon from 'sinon'
import intoStream from 'into-stream'
import { getSparqlQuery } from '../../../lib/query/collection'
import { byTitle } from '../../test-api/filter'
import { ToSparqlPatterns } from '../../../lib/query'

RdfResource.factory.addMixin(...Object.values(Hydra))

type ExpectedQuerySetup = SparqlTemplateResult | {
  patterns: SparqlTemplateResult
  limit: number
  offset: number
}

const expectedQuery = (options: ExpectedQuerySetup) => {
  const patterns = 'patterns' in options ? options.patterns : options
  let select = SELECT.DISTINCT`?member`
    .WHERE`
      ${patterns}
      filter(isiri(?member)) 
    `

  if ('limit' in options) {
    select = select.LIMIT(options.limit).OFFSET(options.offset)
  }

  return select.build()
}

describe('@hydrofoil/labyrinth/lib/query/collection', () => {
  describe('getSparqlQuery', () => {
    let client: StreamClient
    let select: sinon.SinonStub

    beforeEach(() => {
      select = sinon.stub().resolves(intoStream([]))
      client = {
        query: {
          construct: sinon.stub().resolves($rdf.dataset().toStream()),
          select,
        },
      } as any
    })

    describe('members', () => {
      const memberAssertionProperty = [hydra.manages, hydra.memberAssertion]

      for (const property of memberAssertionProperty) {
        describe('using ' + shrink(property.value), () => {
          it('filters by property/object assertion', async () => {
            // given
            const expected = expectedQuery(sparql`?member ${rdf.type} ${schema.Person}`)
            const query = await getSparqlQuery({
              api: api(),
              collection: cf({ dataset: $rdf.dataset() })
                .blankNode()
                .addOut(property, manages => {
                  manages.addOut(hydra.property, rdf.type)
                  manages.addOut(hydra.object, schema.Person)
                }),
              pageSize: 10,
              variables: null,
            })

            // when
            await query?.members(client)

            // then
            expect(client.query.select).to.have.been.calledWith(sinon.match(value => {
              expect(value).to.be.a.query(expected)
              return true
            }))
          })

          it('ignores incomplete member assertion', async () => {
            // given
            const expected = expectedQuery(sparql`?member ${rdf.type} ${schema.Person}`)
            const query = await getSparqlQuery({
              api: api(),
              collection: cf({ dataset: $rdf.dataset() })
                .blankNode()
                .addOut(property, manages => {
                  manages.addOut(hydra.property, rdf.type)
                  manages.addOut(hydra.object, schema.Person)
                })
                .addOut(property, manages => {
                  manages.addOut(hydra.property, ex.foo)
                }),
              pageSize: 10,
              variables: null,
            })

            // when
            await query?.members(client)

            // then
            expect(client.query.select).to.have.been.calledWith(sinon.match(value => {
              expect(value).to.be.a.query(expected)
              return true
            }))
          })

          it('return null if there are no valid member assertions', async () => {
            // given
            const query = await getSparqlQuery({
              api: api(),
              collection: cf({ dataset: $rdf.dataset() })
                .blankNode()
                .addOut(property, manages => {
                  manages.addOut(hydra.property, ex.foo)
                })
                .addOut(property, manages => {
                  manages.addOut(hydra.subject, ex.s)
                  manages.addOut(hydra.property, ex.p)
                  manages.addOut(hydra.object, ex.o)
                }),
              pageSize: 10,
              variables: null,
            })

            // then
            expect(query).to.be.null
          })

          it('filters by subject/object assertion', async () => {
            // given
            const expected = expectedQuery(sparql`${ex.JohnDoe} ?member ${ex.JaneDoe}`)
            const query = await getSparqlQuery({
              api: api(),
              collection: cf({ dataset: $rdf.dataset() })
                .blankNode()
                .addOut(property, manages => {
                  manages.addOut(hydra.subject, ex.JohnDoe)
                  manages.addOut(hydra.object, ex.JaneDoe)
                }),
              pageSize: 10,
              variables: null,
            })

            // when
            await query?.members(client)

            // then
            expect(client.query.select).to.have.been.calledWith(sinon.match(value => {
              expect(value).to.be.a.query(expected)
              return true
            }))
          })

          it('filters by subject/property assertion', async () => {
            // given
            const expected = expectedQuery(sparql`${ex.JohnDoe} ${schema.knows} ?member`)
            const query = await getSparqlQuery({
              api: api(),
              collection: cf({ dataset: $rdf.dataset() })
                .blankNode()
                .addOut(property, manages => {
                  manages.addOut(hydra.property, schema.knows)
                  manages.addOut(hydra.subject, ex.JohnDoe)
                }),
              pageSize: 10,
              variables: null,
            })

            // when
            await query?.members(client)

            // then
            expect(client.query.select).to.have.been.calledWith(sinon.match(value => {
              expect(value).to.be.a.query(expected)
              return true
            }))
          })
        })
      }

      it('return null if there are no member assertions', async () => {
        // given
        const query = await getSparqlQuery({
          api: api(),
          collection: cf({ dataset: $rdf.dataset() }).blankNode(),
          pageSize: 10,
          variables: null,
        })

        // then
        expect(query).to.be.null
      })

      it('filters by annotated criteria', async () => {
        // given
        const expected = expectedQuery(sparql` ${ex.JohnDoe} ${schema.knows} ?member . ?member ${schema.title} "Foo"`)
        const query = await getSparqlQuery({
          api: api<ToSparqlPatterns>({
            code: byTitle,
          }),
          collection: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(hydra.memberAssertion, manages => {
              manages.addOut(hydra.property, schema.knows)
              manages.addOut(hydra.subject, ex.JohnDoe)
            }),
          pageSize: 10,
          variables: fromPointer(cf({ dataset: $rdf.dataset() }).blankNode(), {
            mapping: [{
              types: [hydra.IriTemplateMapping],
              property: schema.title,
              variable: 'title',
              [hyper_query.filter.value]: {},
            }],
          }),
          query: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(schema.title, 'Foo'),
        })

        // when
        await query?.members(client)

        // then
        expect(client.query.select).to.have.been.calledWith(sinon.match(value => {
          expect(value).to.be.a.query(expected)
          return true
        }))
      })

      it('applies LIMIT/OFFSET when template has pageIndex property', async () => {
        // given
        const expected = expectedQuery({
          patterns: sparql`${ex.JohnDoe} ${schema.knows} ?member .`,
          limit: 10,
          offset: 30,
        })
        const query = await getSparqlQuery({
          api: api(),
          collection: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(hydra.memberAssertion, manages => {
              manages.addOut(hydra.property, schema.knows)
              manages.addOut(hydra.subject, ex.JohnDoe)
            }),
          pageSize: 10,
          variables: fromPointer(cf({ dataset: $rdf.dataset() }).blankNode(), {
            mapping: [{
              types: [hydra.IriTemplateMapping],
              property: hydra.pageIndex,
              variable: 'page',
            }],
          }),
          query: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(hydra.pageIndex, 4),
        })

        // when
        await query?.members(client)

        // then
        expect(client.query.select).to.have.been.calledWith(sinon.match(value => {
          expect(value).to.be.a.query(expected)
          return true
        }))
      })

      it('applies page size from query before the default', async () => {
        // given
        const expected = expectedQuery({
          patterns: sparql`${ex.JohnDoe} ${schema.knows} ?member .`,
          limit: 20,
          offset: 60,
        })
        const query = await getSparqlQuery({
          api: api(),
          collection: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(hydra.memberAssertion, manages => {
              manages.addOut(hydra.property, schema.knows)
              manages.addOut(hydra.subject, ex.JohnDoe)
            }),
          pageSize: 10,
          variables: fromPointer(cf({ dataset: $rdf.dataset() }).blankNode(), {
            mapping: [{
              types: [hydra.IriTemplateMapping],
              property: hydra.pageIndex,
              variable: 'offset',
            }, {
              types: [hydra.IriTemplateMapping],
              property: hydra.limit,
              variable: 'limit',
            }],
          }),
          query: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(hydra.pageIndex, 4)
            .addOut(hydra.limit, 20),
        })

        // when
        await query?.members(client)

        // then
        expect(client.query.select).to.have.been.calledWith(sinon.match(value => {
          expect(value).to.be.a.query(expected)
          return true
        }))
      })
    })

    describe('memberData', () => {
      it('returns empty when there are no members', async () => {
        // given
        const query = await getSparqlQuery({
          api: api(),
          collection: cf({ dataset: $rdf.dataset() }).blankNode()
            .addOut(hydra.memberAssertion, manages => {
              manages.addOut(hydra.property, schema.knows)
              manages.addOut(hydra.subject, ex.JohnDoe)
            }),
          pageSize: 10,
          variables: null,
        })

        // when
        const dataset = await $rdf.dataset().import(await query!.memberData(client))

        // then
        expect(dataset.size).to.eq(0)
        expect(client.query.construct).not.to.have.been.called
      })

      it('describes collection members', async () => {
        // given
        const query = await getSparqlQuery({
          api: api(),
          collection: cf({ dataset: $rdf.dataset() }).blankNode()
            .addOut(hydra.memberAssertion, manages => {
              manages.addOut(hydra.property, schema.knows)
              manages.addOut(hydra.subject, ex.JohnDoe)
            }),
          pageSize: 10,
          variables: null,
        })
        select.resolves(intoStream.object([
          ex.JaneDoe,
        ]))

        // when
        await $rdf.dataset().import(await query!.memberData(client))

        // then
        expect(client.query.construct).to.have.been.called
      })
    })
  })
})

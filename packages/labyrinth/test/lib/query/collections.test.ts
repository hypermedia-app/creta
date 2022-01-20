import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import cf from 'clownface'
import $rdf from 'rdf-ext'
import { foaf, hydra, ldp, rdf, schema } from '@tpluscode/rdf-ns-builders'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import { SELECT } from '@tpluscode/sparql-builder'
import * as Hydra from '@rdfine/hydra'
import RdfResource from '@tpluscode/rdfine'
import { hyper_query, knossos } from '@hydrofoil/vocabularies/builders'
import { fromPointer } from '@rdfine/hydra/lib/IriTemplate'
import { ex } from '@labyrinth/testing/namespace'
import '@labyrinth/testing/sparql'
import { api } from '@labyrinth/testing/hydra-box'
import { shrink } from '@zazuko/rdf-vocabularies'
import { StreamClient } from 'sparql-http-client/StreamClient'
import sinon from 'sinon'
import intoStream from 'into-stream'
import { sh } from '@tpluscode/rdf-ns-builders/strict'
import { getSparqlQuery } from '../../../lib/query/collection'
import { byTitle } from '../../test-api/filter'
import { ToSparqlPatterns } from '../../../lib/query'

RdfResource.factory.addMixin(...Object.values(Hydra))

type ExpectedQuerySetup = SparqlTemplateResult | {
  patterns: SparqlTemplateResult
  linkPatterns?: SparqlTemplateResult
  limit?: number
  offset?: number
  order?: Array<{ pattern: SparqlTemplateResult; desc?: boolean }>
}

const expectedQuery = (options: ExpectedQuerySetup) => {
  const patterns = 'patterns' in options ? options.patterns : options
  let select = SELECT.DISTINCT`?member`
    .WHERE`
      ${patterns}
      filter(isiri(?member)) 
    `

  if ('limit' in options && typeof options.limit !== 'undefined' && typeof options.offset !== 'undefined') {
    select = select.LIMIT(options.limit).OFFSET(options.offset)
  }

  if ('order' in options) {
    select = (options.order || []).reduce((query, order, index) => {
      return query.WHERE`optional { ${order.pattern} }`.ORDER().BY($rdf.variable(`order${index + 1}`), order.desc)
    }, select)
  }

  const linkPatterns = !('linkPatterns' in options) ? '' : sparql`${options.linkPatterns} filter(isiri(?linked))`

  return SELECT`?member ?linked`.WHERE`
    { ${select} }
    
    ${linkPatterns}
  `.build()
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

          it('allows member assertions with multiple objects', async () => {
            // given
            const expected = expectedQuery(sparql`?member ${rdf.type} ${foaf.Person}. ?member ${rdf.type} ${foaf.Agent}`)
            const query = await getSparqlQuery({
              api: api(),
              collection: cf({ dataset: $rdf.dataset() })
                .blankNode()
                .addOut(property, manages => {
                  manages.addOut(hydra.property, rdf.type)
                  manages.addOut(hydra.object, [foaf.Person, foaf.Agent])
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

          it('wraps pattern in GRAPH when knossos:ownGraphOnly is true', async () => {
            // given
            const expected = expectedQuery(sparql`GRAPH ?member { ${ex.JohnDoe} ${schema.knows} ?member }`)
            const query = await getSparqlQuery({
              api: api(),
              collection: cf({ dataset: $rdf.dataset() })
                .blankNode()
                .addOut(property, manages => {
                  manages.addOut(hydra.property, schema.knows)
                  manages.addOut(hydra.subject, ex.JohnDoe)
                  manages.addOut(knossos.ownGraphOnly, true)
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

      describe('order', () => {
        it('applies order from collection type', async () => {
          // given
          const expected = expectedQuery({
            patterns: sparql`${ex.JohnDoe} ${schema.knows} ?member .`,
            offset: 0,
            limit: 10,
            order: [{
              pattern: sparql`?member ${schema.name} ?order1 .`,
            }],
          })
          const hydraApi = api()
          const apiNode = cf(hydraApi)
          apiNode
            .node(ex.Collection)
            .addList(hyper_query.order, [
              apiNode.blankNode().addOut(hyper_query.path, schema.name),
            ])
          const query = await getSparqlQuery({
            api: hydraApi,
            collection: cf({ dataset: $rdf.dataset() })
              .blankNode()
              .addOut(rdf.type, ex.Collection)
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
          })

          // when
          await query?.members(client)

          // then
          expect(client.query.select).to.have.been.calledWith(sinon.match(value => {
            expect(value).to.be.a.query(expected)
            return true
          }))
        })

        it('applies descending order', async () => {
          // given
          const expected = expectedQuery({
            patterns: sparql`${ex.JohnDoe} ${schema.knows} ?member .`,
            offset: 0,
            limit: 10,
            order: [{
              pattern: sparql`?member ${schema.name} ?order1 .`,
            }, {
              pattern: sparql`?member ${schema.dateCreated} ?order2 .`,
              desc: true,
            }],
          })
          const hydraApi = api()
          const apiNode = cf(hydraApi)
          apiNode
            .node(ex.Collection)
            .addList(hyper_query.order, [
              apiNode.blankNode().addOut(hyper_query.path, schema.name),
              apiNode.blankNode().addOut(hyper_query.path, schema.dateCreated).addOut(hyper_query.direction, ldp.Descending),
            ])
          const query = await getSparqlQuery({
            api: hydraApi,
            collection: cf({ dataset: $rdf.dataset() })
              .blankNode()
              .addOut(rdf.type, ex.Collection)
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
          })

          // when
          await query?.members(client)

          // then
          expect(client.query.select).to.have.been.calledWith(sinon.match(value => {
            expect(value).to.be.a.query(expected)
            return true
          }))
        })

        it('applies order from collection instance over its type', async () => {
          // given
          const expected = expectedQuery({
            patterns: sparql`${ex.JohnDoe} ${schema.knows} ?member .`,
            offset: 0,
            limit: 10,
            order: [{
              pattern: sparql`?member ${foaf.name} ?order1 .`,
            }],
          })
          const hydraApi = api()
          const apiNode = cf(hydraApi)
          apiNode
            .node(ex.Collection)
            .addList(hyper_query.order, [
              apiNode.blankNode().addOut(hyper_query.path, schema.name),
            ])
          const collection = cf({ dataset: $rdf.dataset() }).blankNode()
          const query = await getSparqlQuery({
            api: hydraApi,
            collection: collection
              .addOut(rdf.type, ex.Collection)
              .addOut(hydra.memberAssertion, manages => {
                manages.addOut(hydra.property, schema.knows)
                manages.addOut(hydra.subject, ex.JohnDoe)
              })
              .addList(hyper_query.order, [
                collection.blankNode().addOut(hyper_query.path, foaf.name),
              ]),
            pageSize: 10,
            variables: fromPointer(cf({ dataset: $rdf.dataset() }).blankNode(), {
              mapping: [{
                types: [hydra.IriTemplateMapping],
                property: hydra.pageIndex,
                variable: 'page',
              }],
            }),
          })

          // when
          await query?.members(client)

          // then
          expect(client.query.select).to.have.been.calledWith(sinon.match(value => {
            expect(value).to.be.a.query(expected)
            return true
          }))
        })

        it('does not apply order when collection is not paged', async () => {
          // given
          const expected = expectedQuery({
            patterns: sparql`${ex.JohnDoe} ${schema.knows} ?member .`,
          })
          const hydraApi = api()
          const apiNode = cf(hydraApi)
          apiNode
            .node(ex.Collection)
            .addList(hyper_query.order, [
              apiNode.blankNode().addOut(hyper_query.path, schema.name),
            ])
          const query = await getSparqlQuery({
            api: hydraApi,
            collection: cf({ dataset: $rdf.dataset() })
              .blankNode()
              .addOut(rdf.type, ex.Collection)
              .addOut(hydra.memberAssertion, manages => {
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

      describe('include', () => {
        it('adds optional patterns for included resources', async () => {
          // given
          const expected = expectedQuery({
            patterns: sparql`
              ${ex.JohnDoe} ${schema.knows} ?member .
            `,
            linkPatterns: sparql`
              {
                ?member ^${schema.parent} ?linked
              }
              union
              {
                ?member ${schema.spouse} ?linked
              }`,
          })
          const hydraApi = api()
          const apiNode = cf(hydraApi)
          apiNode
            .node(ex.Collection)
            .addOut(hyper_query.memberInclude, include => {
              include.addOut(hyper_query.path, path => {
                path.addOut(sh.inversePath, schema.parent)
              })
            })
          const query = await getSparqlQuery({
            api: hydraApi,
            collection: cf({ dataset: $rdf.dataset() })
              .blankNode()
              .addOut(rdf.type, ex.Collection)
              .addOut(hyper_query.memberInclude, include => {
                include.addOut(hyper_query.path, schema.spouse)
              })
              .addOut(hydra.memberAssertion, manages => {
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

        it('ignores :include without path', async () => {
          // given
          const expected = expectedQuery({
            patterns: sparql`
              ${ex.JohnDoe} ${schema.knows} ?member .
            `,
          })
          const hydraApi = api()
          const apiNode = cf(hydraApi)
          apiNode
            .node(ex.Collection)
            .addOut(hyper_query.include, null)
          const query = await getSparqlQuery({
            api: hydraApi,
            collection: cf({ dataset: $rdf.dataset() })
              .blankNode()
              .addOut(rdf.type, ex.Collection)
              .addOut(hyper_query.include, null)
              .addOut(hydra.memberAssertion, manages => {
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
          { member: ex.JaneDoe },
        ]))

        // when
        await $rdf.dataset().import(await query!.memberData(client))

        // then
        expect(client.query.construct).to.have.been.called
      })
    })
  })
})

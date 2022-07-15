import { expect } from 'chai'
import { Api } from 'hydra-box/Api'
import { hydraBox } from '@labyrinth/testing/hydra-box'
import clownface, { GraphPointer } from 'clownface'
import { blankNode, namedNode } from '@labyrinth/testing/nodeFactory'
import * as Sparql from '@labyrinth/testing/sparql'
import { ex } from '@labyrinth/testing/namespace'
import { fromPointer as iriTemplate } from '@rdfine/hydra/lib/IriTemplate'
import { sparql } from '@tpluscode/rdf-string'
import { hydra, ldp, rdf, rdfs, schema, sh, vcard, foaf } from '@tpluscode/rdf-ns-builders'
import RdfResource from '@tpluscode/rdfine'
import { rdfList } from '@tpluscode/rdfine/initializer'
import * as Hydra from '@rdfine/hydra'
import { code, hyper_query, knossos } from '@hydrofoil/vocabularies/builders'
import sinon from 'sinon'
import type { LoaderRegistry } from 'rdf-loaders-registry'
import $rdf from 'rdf-ext'
import toStream from 'into-stream'
import { toRdf } from 'rdf-literal'
import { SELECT } from '@tpluscode/sparql-builder'
import dynamicCollection, { createFilters } from '../../../lib/query/dynamicCollection'
import { ToSparqlPatterns } from '../../../lib/query'

RdfResource.factory.addMixin(...Object.values(Hydra))

describe('@hydrofoil/labyrinth/lib/query/dynamicCollection', () => {
  let api: Api
  let loaderRegistry: sinon.SinonStubbedInstance<LoaderRegistry>
  let collection: GraphPointer
  let pageSize: number
  let query: GraphPointer
  let client: Sparql.StubbedClient
  let variables: Hydra.IriTemplate | null

  beforeEach(async () => {
    ({ api } = await hydraBox())
    loaderRegistry = api.loaderRegistry as any
    collection = namedNode(ex.people)
      .addOut(hydra.memberAssertion, ma => {
        ma.addOut(hydra.property, rdf.type)
          .addOut(hydra.object, ex.Person)
      })
    pageSize = 10
    query = blankNode()
    client = Sparql.client()
    variables = null
  })

  function testInstance() {
    return dynamicCollection({
      api,
      collection,
      pageSize,
      query,
      client,
      variables,
    })
  }

  describe('members', () => {
    let loaderRegistry: sinon.SinonStubbedInstance<LoaderRegistry>

    beforeEach(() => {
      loaderRegistry = api.loaderRegistry as any
    })

    it('queries with member assertion patterns', async () => {
      // given
      collection.addOut(hydra.memberAssertion, ma => {
        ma.addOut(hydra.property, vcard.hasMember)
          .addOut(hydra.subject, ex.Group)
      })
      const queries = await testInstance()

      // when
      await queries.members()

      // then
      expect(client.query.select).to.have.been.calledOnce
      expect(client.query.select.firstCall.firstArg).to.be.a.query(sparql`SELECT distinct ?member {
        ?member ${rdf.type} ${ex.Person} .
        ${ex.Group} ${vcard.hasMember} ?member .
        filter(isiri(?member))
      }`)
    })

    it('queries with member assertion patterns combined from instance and class', async () => {
      // given
      collection
        .addOut(rdf.type, ex.Collection)
      clownface(api)
        .node(ex.Collection)
        .addOut(hydra.memberAssertion, ma => {
          ma.addOut(hydra.property, rdf.type)
            .addOut(hydra.object, foaf.Person)
        })
      const queries = await testInstance()

      // when
      await queries.members()

      // then
      expect(client.query.select).to.have.been.calledOnce
      expect(client.query.select.firstCall.firstArg).to.be.a.query(sparql`SELECT distinct ?member {
        ?member ${rdf.type} ${foaf.Person} .
        ?member ${rdf.type} ${ex.Person} .
        filter(isiri(?member))
      }`)
    })

    it('does not generate duplicate patterns for same assertion', async () => {
      // given
      collection.addOut(hydra.memberAssertion, ma => {
        ma.addOut(hydra.property, vcard.hasMember)
          .addOut(hydra.subject, ex.Group)
      })
      collection.addOut(hydra.manages, collection.out(hydra.memberAssertion))
      const queries = await testInstance()

      // when
      await queries.members()

      // then
      expect(client.query.select).to.have.been.calledOnce
      expect(client.query.select.firstCall.firstArg).to.be.a.query(sparql`SELECT distinct ?member {
        ?member ${rdf.type} ${ex.Person} .
        ${ex.Group} ${vcard.hasMember} ?member .
        filter(isiri(?member))
      }`)
    })

    it('allows member assertions with multiple objects', async () => {
      // given
      collection.addOut(hydra.memberAssertion, ma => {
        ma.addOut(hydra.property, vcard.hasMember)
          .addOut(hydra.subject, [ex.Group, ex.Admins])
      })
      const queries = await testInstance()

      // when
      await queries.members()

      // then
      expect(client.query.select).to.have.been.calledOnce
      expect(client.query.select.firstCall.firstArg).to.be.a.query(sparql`SELECT distinct ?member {
        ?member ${rdf.type} ${ex.Person} .
        ${ex.Group} ${vcard.hasMember} ?member .
        ${ex.Admins} ${vcard.hasMember} ?member .
        filter(isiri(?member))
      }`)
    })

    it('wraps member assertion pattern in GRAPH when knossos:ownGraphOnly is true', async () => {
      // given
      collection.out(hydra.memberAssertion)
        .addOut(knossos.ownGraphOnly, true)
      const queries = await testInstance()

      // when
      await queries.members()

      // then
      expect(client.query.select).to.have.been.calledOnce
      expect(client.query.select.firstCall.firstArg).to.be.a.query(sparql`SELECT distinct ?member {
        GRAPH ?member { ?member ${rdf.type} ${ex.Person} . }
        filter(isiri(?member))
      }`)
    })

    it('queries with member assertion patterns using hydra:manages', async () => {
      // given
      collection.addOut(hydra.memberAssertion, ma => {
        ma.addOut(hydra.property, vcard.hasMember)
          .addOut(hydra.subject, ex.Group)
      })
      const memberAssertions = collection.out(hydra.memberAssertion)
      collection.deleteOut(hydra.memberAssertion).addOut(hydra.manages, memberAssertions)
      const queries = await testInstance()

      // when
      await queries.members()

      // then
      expect(client.query.select).to.have.been.calledOnce
      expect(client.query.select.firstCall.firstArg).to.be.a.query(sparql`SELECT distinct ?member {
        ?member ${rdf.type} ${ex.Person} .
        ${ex.Group} ${vcard.hasMember} ?member .
        filter(isiri(?member))
      }`)
    })

    it('ignores incomplete member assertion', async () => {
      // given
      collection.addOut(hydra.memberAssertion, ma => {
        ma.addOut(hydra.property, schema.status)
      }).addOut(hydra.memberAssertion, ma => {
        ma.addOut(hydra.object, schema.status)
      }).addOut(hydra.memberAssertion, ma => {
        ma.addOut(hydra.subject, schema.status)
      })
      const queries = await testInstance()

      // when
      await queries.members()

      // then
      expect(client.query.select).to.have.been.calledOnce
      expect(client.query.select.firstCall.firstArg).to.be.a.query(sparql`SELECT distinct ?member {
        ?member ${rdf.type} ${ex.Person} .
        filter(isiri(?member))
      }`)
    })

    it('does not query when there is no valid member assertion', async () => {
      // given
      collection.deleteOut(hydra.memberAssertion)
      collection.addOut(hydra.memberAssertion, ma => {
        ma.addOut(hydra.property, schema.status)
      }).addOut(hydra.memberAssertion, ma => {
        ma.addOut(hydra.object, schema.status)
      }).addOut(hydra.memberAssertion, ma => {
        ma.addOut(hydra.subject, schema.status)
      })
      const queries = await testInstance()

      // when
      const terms = await queries.members()

      // then
      expect(client.query.select).not.to.have.been.called
      expect(terms).to.have.length(0)
    })

    it('queries with LIMIT/OFFSET', async () => {
      // given
      pageSize = 15
      variables = iriTemplate(blankNode(), {
        mapping: {
          variable: 'page',
          property: hydra.pageIndex,
        },
      })
      query.addOut(hydra.pageIndex, 16)
      const queries = await testInstance()

      // when
      await queries.members()

      // then
      expect(client.query.select).to.have.been.calledOnce
      expect(client.query.select.firstCall.firstArg).to.be.a.query(sparql`SELECT distinct ?member {
        ?member ${rdf.type} ${ex.Person} .
        filter(isiri(?member))
      } LIMIT 15 OFFSET 225`)
    })

    it('adds patterns from annotated template mappings', async () => {
      // given
      variables = iriTemplate(blankNode(), {
        mapping: {
          variable: 'title',
          property: schema.title,
          [hyper_query.filter.value]: {
            [code.implementedBy.value]: {},
          },
        },
      })
      query.addOut(schema.title, 'Titanic')
      const filterImpl = sinon.stub().returns(sparql`filter(REGEX("Titanic"))`)
      loaderRegistry.load.resolves(filterImpl)
      const queries = await testInstance()

      // when
      await queries.members()

      // then
      expect(client.query.select).to.have.been.calledOnce
      expect(client.query.select.firstCall.firstArg).to.be.a.query(sparql`SELECT distinct ?member {
        ?member ${rdf.type} ${ex.Person} .
        
        filter(REGEX("Titanic"))
        filter(isiri(?member))
      }`)
      expect(filterImpl).to.have.been.calledWith(sinon.match({
        subject: $rdf.variable('member'),
        predicate: schema.title,
        object: sinon.match({
          term: $rdf.literal('Titanic'),
        }),
      }))
    })

    it('returns member identifiers as returned by query', async () => {
      // given
      client.query.select.resolves(toStream.object([
        { member: ex.Foo },
        { member: ex.Bar },
      ]))
      const queries = await testInstance()

      // when
      const members = await queries.members()

      // then
      expect(members).to.deep.contain.members([ex.Foo, ex.Bar])
    })

    describe('order', () => {
      it('does not apply order when collection is not paged', async () => {
        // given
        const apiNode = clownface(api)
        collection.addOut(rdf.type, ex.Collection)
        apiNode
          .namedNode(ex.Collection)
          .addList(hyper_query.order, [
            apiNode.blankNode().addOut(hyper_query.path, schema.name),
          ])
        const queries = await testInstance()

        // when
        await queries.members()

        // then
        expect(client.query.select).to.have.been.calledOnce
        expect(client.query.select.firstCall.firstArg).to.be.a.query(sparql`SELECT distinct ?member {
          ?member ${rdf.type} ${ex.Person} .
          filter(isiri(?member)) 
        }`)
      })

      it('applies order from collection type', async () => {
        // given
        const apiNode = clownface(api)
        collection.addOut(rdf.type, ex.Collection)
        apiNode
          .namedNode(ex.Collection)
          .addList(hyper_query.order, [
            apiNode.blankNode().addList(hyper_query.path, [ex.project, rdfs.label]),
          ])
        variables = iriTemplate(blankNode(), {
          mapping: {
            variable: 'page',
            property: hydra.pageIndex,
          },
        })
        const queries = await testInstance()

        // when
        await queries.members()

        // then
        expect(client.query.select).to.have.been.calledOnce
        expect(client.query.select.firstCall.firstArg).to.be.a.query(sparql`SELECT distinct ?member {
          ?member ${rdf.type} ${ex.Person} .
          filter(isiri(?member))
          
          optional {
            ?member ${ex.project}/${rdfs.label} ?order1
          }       
        } order by ?order1 limit 10 offset 0`)
      })

      it('applies descending order', async () => {
        // given
        const apiNode = clownface(api)
        collection.addOut(rdf.type, ex.Collection)
        apiNode
          .namedNode(ex.Collection)
          .addList(hyper_query.order, [
            apiNode.blankNode()
              .addList(hyper_query.path, [ex.project, rdfs.label])
              .addOut(hyper_query.direction, ldp.Descending),
          ])
        variables = iriTemplate(blankNode(), {
          mapping: {
            variable: 'page',
            property: hydra.pageIndex,
          },
        })
        const queries = await testInstance()

        // when
        await queries.members()

        // then
        expect(client.query.select).to.have.been.calledOnce
        expect(client.query.select.firstCall.firstArg).to.be.a.query(sparql`SELECT distinct ?member {
          ?member ${rdf.type} ${ex.Person} .
          filter(isiri(?member))
          
          optional {
            ?member ${ex.project}/${rdfs.label} ?order1
          }       
        } order by DESC(?order1) limit 10 offset 0`)
      })

      it('applies instance order order type order', async () => {
        // given
        const apiNode = clownface(api)
        collection.addOut(rdf.type, ex.Collection)
          .addList(hyper_query.order, [
            collection.blankNode().addOut(hyper_query.path, foaf.name),
          ])
        apiNode
          .namedNode(ex.Collection)
          .addList(hyper_query.order, [
            apiNode.blankNode()
              .addList(hyper_query.path, schema.name),
          ])
        variables = iriTemplate(blankNode(), {
          mapping: {
            variable: 'page',
            property: hydra.pageIndex,
          },
        })
        const queries = await testInstance()

        // when
        await queries.members()

        // then
        expect(client.query.select).to.have.been.calledOnce
        expect(client.query.select.firstCall.firstArg).to.be.a.query(sparql`SELECT distinct ?member {
          ?member ${rdf.type} ${ex.Person} .
          filter(isiri(?member))
          
          optional {
            ?member ${foaf.name} ?order1
          }       
        } order by ?order1 limit 10 offset 0`)
      })
    })
  })

  describe('total', () => {
    it('counts members', async () => {
      // given
      client.query.select.resolves(toStream.object([{ count: toRdf(1010) }]))
      const queries = await testInstance()

      // when
      const count = await queries.total()

      // then
      expect(count).to.eq(1010)
      expect(client.query.select.firstCall.firstArg).to.be.a.query(sparql`SELECT (COUNT(distinct ?member) as ?count) {
        ?member ${rdf.type} ${ex.Person}
      }`)
    })
  })

  describe('memberData', () => {
    it('uniquely describes members', async () => {
      // give
      const queries = await testInstance()

      // when
      await queries.memberData([ex.foo, ex.foo, ex.foo, ex.bar])

      // then
      expect(client.query.construct).to.have.been.calledOnce
      expect(client.query.construct.firstCall.firstArg).to.be.a.query(sparql`DESCRIBE ?resource {
        VALUES ?resource { ${ex.foo} ${ex.bar} }
      }`)
    })

    it('describes members and annotated links', async () => {
      // give
      const apiNode = clownface(api)
      collection.addOut(rdf.type, ex.Collection)
        .addOut(hyper_query.memberInclude, include => {
          include.addOut(hyper_query.path, schema.spouse)
        })
      apiNode
        .namedNode(ex.Collection)
        .addOut(hyper_query.memberInclude, include => {
          include.addOut(hyper_query.path, path => {
            path.addOut(sh.inversePath, schema.parent)
          })
        })
      const queries = await testInstance()

      // when
      await queries.memberData([ex.foo, ex.bar])

      // then
      expect(client.query.construct).to.have.been.calledOnce
      expect(client.query.construct.firstCall.firstArg).to.be.a.query(sparql`DESCRIBE ?resource ?linked {
        VALUES ?resource { ${ex.foo} ${ex.bar} }

        optional {
          {
            ?resource ^${schema.parent} ?linked
          }
          union
          {
            ?resource ${schema.spouse} ?linked
          }
          
          filter(isiri(?linked))
        }
      }`)
    })

    it('combines multiple include paths', async () => {
      // give
      collection.addOut(rdf.type, ex.Collection)
        .addOut(hyper_query.memberInclude, include => {
          include.addOut(hyper_query.path, schema.spouse)
          include.addOut(hyper_query.path, schema.knows)
        })
      const queries = await testInstance()

      // when
      await queries.memberData([ex.foo, ex.bar])

      // then
      expect(client.query.construct).to.have.been.calledOnce
      expect(client.query.construct.firstCall.firstArg).to.be.a.query(sparql`DESCRIBE ?resource ?linked {
        VALUES ?resource { ${ex.foo} ${ex.bar} }
        
        optional {
          {
            ?resource ${schema.spouse} ?linked
          }
          union
          {
            ?resource ${schema.knows} ?linked
          }
          
          filter(isiri(?linked))
        }
      }`)
    })

    it('ignores includes without path', async () => {
      // give
      const apiNode = clownface(api)
      collection.addOut(rdf.type, ex.Collection)
        .addOut(hyper_query.memberInclude, null)
      apiNode
        .namedNode(ex.Collection)
        .addOut(hyper_query.memberInclude, null)
      const queries = await testInstance()

      // when
      await queries.memberData([ex.foo, ex.bar])

      // then
      expect(client.query.construct).to.have.been.calledOnce
      expect(client.query.construct.firstCall.firstArg).to.be.a.query(sparql`DESCRIBE ?resource {
        VALUES ?resource { ${ex.foo} ${ex.bar} }
      }`)
    })

    it('returns empty when there are no members', async () => {
      // given
      const queries = await testInstance()

      // when
      const result = await $rdf.dataset().import(await queries.memberData([]))

      // then
      expect(client.query.construct).not.to.have.been.calledOnce
      expect(result.size).to.eq(0)
    })
  })

  describe('createFilters', () => {
    const subject = $rdf.variable('member')

    it('ensures unique variable names', async () => {
      // given
      query = blankNode()
      variables = iriTemplate(blankNode(), {
        mapping: [{
          variable: 'title',
          property: schema.title,
          [hyper_query.filter.value]: {
            [code.implementedBy.value]: {},
          },
        }, {
          variable: 'label',
          property: schema.name,
          [hyper_query.filter.value]: {
            [code.implementedBy.value]: {},
          },
        }],
      })
      const filterFake: ToSparqlPatterns = ({ subject, predicate, variable, object }) => {
        return sparql`
          ${subject} ${predicate} ${variable('var')} .
          filter (strlen(${variable('var')}) > ${object.term})
        `
      }
      loaderRegistry.load.resolves(sinon.stub().callsFake(filterFake))
      query.addOut(schema.name, 10)
      query.addOut(schema.title, 20)

      // when
      const filters = await createFilters({ subject, api, query, variables })
      const select = SELECT.ALL.WHERE`${filters}`

      // then
      expect(select).to.be.query(sparql`SELECT * WHERE {
        ?member ${schema.title} ?filter1_var .
        filter (strlen(?filter1_var) > 20)
        
        ?member ${schema.name} ?filter2_var .
        filter (strlen(?filter2_var) > 10)
      }`)
    })

    it('passes named arguments to filter function', async () => {
      // given
      query = blankNode()
      variables = iriTemplate(blankNode(), {
        mapping: [{
          variable: 'title',
          property: schema.title,
          [hyper_query.filter.value]: {
            [code.implementedBy.value]: {},
            [code.arguments.value]: {
              [code.name.value]: 'flags',
              [code.value.value]: 'i',
            },
          },
        }],
      })
      const regexFilter: ToSparqlPatterns = ({ subject, predicate, variable, object }, { flags = '' } = {}) => {
        return sparql`
          ${subject} ${predicate} ${variable('var')} .
          filter (regex("${object.value}", ${variable('var')}, "${flags}"))
        `
      }
      loaderRegistry.load.onFirstCall().resolves(sinon.stub().callsFake(regexFilter))
      query.addOut(schema.title, 'hello world')

      // when
      const filters = await createFilters({ subject, api, query, variables })
      const select = SELECT.ALL.WHERE`${filters}`

      // then
      expect(select).to.be.query(sparql`SELECT * WHERE {
        ?member ${schema.title} ?filter1_var .
        filter (regex("hello world", ?filter1_var, "i"))
      }`)
    })

    it('passes positional arguments to filter function', async () => {
      // given
      query = blankNode()
      variables = iriTemplate(blankNode(), {
        mapping: [{
          variable: 'title',
          property: schema.title,
          [hyper_query.filter.value]: {
            [code.implementedBy.value]: {},
            [code.arguments.value]: rdfList('ig'),
          },
        }],
      })
      const regexFilter: ToSparqlPatterns = ({ subject, predicate, variable, object }, flags = '') => {
        return sparql`
          ${subject} ${predicate} ${variable('var')} .
          filter (regex("${object.value}", ${variable('var')}, "${flags}"))
        `
      }
      loaderRegistry.load.onFirstCall().resolves(sinon.stub().callsFake(regexFilter))
      query.addOut(schema.title, 'hello world')

      // when
      const filters = await createFilters({ subject, api, query, variables })
      const select = SELECT.ALL.WHERE`${filters}`

      // then
      expect(select).to.be.query(sparql`SELECT * WHERE {
        ?member ${schema.title} ?filter1_var .
        filter (regex("hello world", ?filter1_var, "ig"))
      }`)
    })
  })
})

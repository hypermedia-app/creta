import { describe, it } from 'mocha'
import { expect } from 'chai'
import cf from 'clownface'
import $rdf from 'rdf-ext'
import { hydra, rdf, schema } from '@tpluscode/rdf-ns-builders'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import { CONSTRUCT, SELECT } from '@tpluscode/sparql-builder'
import * as Hydra from '@rdfine/hydra'
import RdfResource from '@tpluscode/rdfine'
import * as ns from '@hydrofoil/namespaces'
import { fromPointer } from '@rdfine/hydra/lib/IriTemplate'
import { ex } from '@labyrinth/testing/namespace'
import '@labyrinth/testing/sparql'
import { api } from '@labyrinth/testing/hydra-box'
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
  let select = SELECT`?g`
    .WHERE`
      GRAPH ?g { 
        ${patterns}
      }
    `

  if ('limit' in options) {
    select = select.LIMIT(options.limit).OFFSET(options.offset)
  }

  const query = CONSTRUCT`?s ?p ?o`
    .WHERE`{
      ${select}
    }
    
    GRAPH ?g { ?s ?p ?o }`

  return query.build()
}

describe('@hydrofoil/labyrinth/lib/query/collection', () => {
  describe('getSparqlQuery', () => {
    describe('members', () => {
      it('filters by property/object manages block', async () => {
        // given
        const expected = expectedQuery(sparql`?member ${rdf.type} ${schema.Person}`)
        const query = await getSparqlQuery({
          api: api(),
          collection: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(hydra.manages, manages => {
              manages.addOut(hydra.property, rdf.type)
              manages.addOut(hydra.object, schema.Person)
            }),
          pageSize: 10,
          variables: null,
        })

        // when
        const result = query?.members.build()

        // then
        expect(result).to.be.a.query(expected)
      })

      it('ignores incomplete manages blocks', async () => {
        // given
        const expected = expectedQuery(sparql`?member ${rdf.type} ${schema.Person}`)
        const query = await getSparqlQuery({
          api: api(),
          collection: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(hydra.manages, manages => {
              manages.addOut(hydra.property, rdf.type)
              manages.addOut(hydra.object, schema.Person)
            })
            .addOut(hydra.manages, manages => {
              manages.addOut(hydra.property, ex.foo)
            }),
          pageSize: 10,
          variables: null,
        })

        // when
        const result = query?.members.build()

        // then
        expect(result).to.be.a.query(expected)
      })

      it('return null if there are no manages blocks', async () => {
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

      it('return null if there are no valid manages blocks', async () => {
        // given
        const query = await getSparqlQuery({
          api: api(),
          collection: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(hydra.manages, manages => {
              manages.addOut(hydra.property, ex.foo)
            })
            .addOut(hydra.manages, manages => {
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

      it('filters by subject/object manages block', async () => {
        // given
        const expected = expectedQuery(sparql`${ex.JohnDoe} ?member ${ex.JaneDoe}`)
        const query = await getSparqlQuery({
          api: api(),
          collection: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(hydra.manages, manages => {
              manages.addOut(hydra.subject, ex.JohnDoe)
              manages.addOut(hydra.object, ex.JaneDoe)
            }),
          pageSize: 10,
          variables: null,
        })

        // when
        const result = query?.members.build()

        // then
        expect(result).to.be.a.query(expected)
      })

      it('filters by subject/property manages block', async () => {
        // given
        const expected = expectedQuery(sparql`${ex.JohnDoe} ${schema.knows} ?member`)
        const query = await getSparqlQuery({
          api: api(),
          collection: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(hydra.manages, manages => {
              manages.addOut(hydra.property, schema.knows)
              manages.addOut(hydra.subject, ex.JohnDoe)
            }),
          pageSize: 10,
          variables: null,
        })

        // when
        const result = query?.members.build()

        // then
        expect(result).to.be.a.query(expected)
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
            .addOut(hydra.manages, manages => {
              manages.addOut(hydra.property, schema.knows)
              manages.addOut(hydra.subject, ex.JohnDoe)
            }),
          pageSize: 10,
          variables: fromPointer(cf({ dataset: $rdf.dataset() }).blankNode(), {
            mapping: [{
              types: [hydra.IriTemplateMapping],
              property: schema.title,
              variable: 'title',
              [ns.query.filter.value]: {},
            }],
          }),
          query: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(schema.title, 'Foo'),
        })

        // when
        const result = query?.members.build()

        // then
        expect(result).to.be.a.query(expected)
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
            .addOut(hydra.manages, manages => {
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
        const result = query?.members.build()

        // then
        expect(result).to.be.a.query(expected)
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
            .addOut(hydra.manages, manages => {
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
        const result = query?.members.build()

        // then
        expect(result).to.be.a.query(expected)
      })
    })
  })
})

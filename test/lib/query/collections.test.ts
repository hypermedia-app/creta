import path from 'path'
import { describe, it } from 'mocha'
import { expect } from 'chai'
import cf from 'clownface'
import $rdf from 'rdf-ext'
import { hydra, rdf, schema } from '@tpluscode/rdf-ns-builders'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import { getSparqlQuery } from '../../../lib/query/collection'
import '../../support/sparql'
import { ex } from '../../support/namespace'
import * as Hydra from '@rdfine/hydra'
import RdfResource from '@tpluscode/rdfine'
import { code, query } from '../../../lib/namespace'

RdfResource.factory.addMixin(...Object.values(Hydra))

const basePath = path.resolve(__dirname, '../../')

const expectedQuery = (patterns: string | SparqlTemplateResult) => sparql`CONSTRUCT { ?s ?p ?o }
WHERE {
  {
    SELECT ?g {
      GRAPH ?g { 
        ${patterns}
      }
    }
  }
  
  GRAPH ?g { ?s ?p ?o }
}`

describe('labyrinth/lib/query/collection', () => {
  describe('getSparqlQuery', () => {
    describe('members', () => {
      it('filters by property/object manages block', async () => {
        // given
        const expected = expectedQuery(sparql`?member ${rdf.type} ${schema.Person}`)
        const { members } = await getSparqlQuery({
          api: cf({ dataset: $rdf.dataset() }).blankNode(),
          collection: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(hydra.manages, null as any, manages => {
              manages.addOut(hydra.property, rdf.type)
              manages.addOut(hydra.object, schema.Person)
            }),
          pageSize: 10,
          basePath,
          variables: null,
        })

        // when
        const result = members.build()

        // then
        expect(result).to.be.a.query(expected)
      })

      it('ignores incomplete manages blocks', async () => {
        // given
        const expected = expectedQuery(sparql`?member ${rdf.type} ${schema.Person}`)
        const { members } = await getSparqlQuery({
          api: cf({ dataset: $rdf.dataset() }).blankNode(),
          collection: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(hydra.manages, null as any, manages => {
              manages.addOut(hydra.property, rdf.type)
              manages.addOut(hydra.object, schema.Person)
            })
            .addOut(hydra.manages, null as any, manages => {
              manages.addOut(hydra.property, ex.foo)
            }),
          pageSize: 10,
          basePath,
          variables: null,
        })

        // when
        const result = members.build()

        // then
        expect(result).to.be.a.query(expected)
      })

      it('filters by subject/object manages block', async () => {
        // given
        const expected = expectedQuery(sparql`${ex.JohnDoe} ?member ${ex.JaneDoe}`)
        const { members } = await getSparqlQuery({
          api: cf({ dataset: $rdf.dataset() }).blankNode(),
          collection: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(hydra.manages, null as any, manages => {
              manages.addOut(hydra.subject, ex.JohnDoe)
              manages.addOut(hydra.object, ex.JaneDoe)
            }),
          pageSize: 10,
          basePath,
          variables: null,
        })

        // when
        const result = members.build()

        // then
        expect(result).to.be.a.query(expected)
      })

      it('filters by subject/property manages block', async () => {
        // given
        const expected = expectedQuery(sparql`${ex.JohnDoe} ${schema.knows} ?member`)
        const { members } = await getSparqlQuery({
          api: cf({ dataset: $rdf.dataset() }).blankNode(),
          collection: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(hydra.manages, null as any, manages => {
              manages.addOut(hydra.property, schema.knows)
              manages.addOut(hydra.subject, ex.JohnDoe)
            }),
          pageSize: 10,
          basePath,
          variables: null,
        })

        // when
        const result = members.build()

        // then
        expect(result).to.be.a.query(expected)
      })

      it('filters by annotated criteria', async () => {
        // given
        const expected = expectedQuery(sparql`?member ${schema.title} "Foo"`)
        const { members } = await getSparqlQuery({
          api: cf({ dataset: $rdf.dataset() }).blankNode(),
          collection: cf({ dataset: $rdf.dataset() }).blankNode(),
          pageSize: 10,
          basePath,
          variables: new Hydra.IriTemplateMixin.Class(cf({ dataset: $rdf.dataset() }).blankNode(), {
            mapping: [{
              types: [hydra.IriTemplateMapping],
              property: schema.title,
              variable: 'title',
              [query.filter.value]: {
                types: [code.EcmaScript],
                [code.link.value]: $rdf.namedNode('file:test-api/filter#byTitle'),
              },
            }],
          }),
          query: cf({ dataset: $rdf.dataset() })
            .blankNode()
            .addOut(schema.title, 'Foo'),
        })

        // when
        const result = members.build()

        // then
        expect(result).to.be.a.query(expected)
      })
    })
  })
})

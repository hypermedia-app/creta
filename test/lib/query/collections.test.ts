import { describe, it } from 'mocha'
import { expect } from 'chai'
import cf from 'clownface'
import $rdf from 'rdf-ext'
import { hydra, rdf, schema } from '@tpluscode/rdf-ns-builders'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import { getSparqlQuery } from '../../../lib/query/collection'
import '../../support/sparql'

const expectedQuery = (patterns: string | SparqlTemplateResult) => sparql`CONSTRUCT { ?s ?p ?o. ?is ?io ?ip }
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
      it('filters by manages block', async () => {
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
          basePath: __dirname,
          variables: null,
        })

        // when
        const result = members.build()

        // then
        expect(result).to.be.a.query(expected)
      })
    })
  })
})

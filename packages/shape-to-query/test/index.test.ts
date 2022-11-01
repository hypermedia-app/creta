import { parse } from '@labyrinth/testing/nodeFactory'
import { foaf, schema, sh } from '@tpluscode/rdf-ns-builders'
import { SELECT } from '@tpluscode/sparql-builder'
import { expect } from 'chai'
import { sparql } from '@tpluscode/rdf-string'
import { ex } from '@labyrinth/testing/namespace'
import { construct, shapeToPatterns } from '..'
import '@labyrinth/testing/sparql'

describe('@hydrofoil/shape-to-query', () => {
  describe('shapeToPatterns', () => {
    context('targets', () => {
      context('class target', () => {
        it('creates an rdf:type pattern', async () => {
          // given
          const shape = await parse`
            <>
              a ${sh.NodeShape} ;
              ${sh.targetClass} ${foaf.Person} .
          `

          // when
          const patterns = shapeToPatterns(shape, { subjectVariable: 'node' })
          const query = SELECT.ALL.WHERE`${patterns}`.build()

          // then
          expect(query).to.be.a.query(sparql`SELECT * WHERE {
            ?node a ${foaf.Person}
          }`)
        })

        it('creates an rdf:type pattern for multiple targets', async () => {
          // given
          const shape = await parse`
            <>
              a ${sh.NodeShape} ;
              ${sh.targetClass} ${foaf.Person}, ${schema.Person} .
          `

          // when
          const patterns = shapeToPatterns(shape, { subjectVariable: 'node' })
          const query = SELECT.ALL.WHERE`${patterns}`.build()

          // then
          expect(query).to.be.a.query(sparql`SELECT * WHERE {
            ?node a ?node_targetClass .
            FILTER ( ?node_targetClass IN (${foaf.Person}, ${schema.Person}) )
          }`)
        })
      })
    })

    context('property constraints', () => {
      it('creates a simple pattern for predicate path', async () => {
        // given
        const shape = await parse`
          <>
            a ${sh.NodeShape} ;
            ${sh.property}
            [
              ${sh.path} ${foaf.name} ;
            ] ; 
          .
        `

        // when
        const patterns = shapeToPatterns(shape, { subjectVariable: 'node' })
        const query = SELECT.ALL.WHERE`${patterns}`.build()

        // then
        expect(query).to.be.a.query(sparql`SELECT * WHERE {
          ?node ${foaf.name} ?node_0 .
        }`)
      })

      it('creates patterns for multiple properties', async () => {
        // given
        const shape = await parse`
          <>
            a ${sh.NodeShape} ;
            ${sh.property}
            [
              ${sh.path} ${foaf.name} ;
            ],
            [
              ${sh.path} ${foaf.lastName} ;
            ] ; 
          .
        `

        // when
        const patterns = shapeToPatterns(shape, { subjectVariable: 'node' })
        const query = SELECT.ALL.WHERE`${patterns}`.build()

        // then
        expect(query).to.be.a.query(sparql`SELECT * WHERE {
          ?node ${foaf.name} ?node_0 .
          ?node ${foaf.lastName} ?node_1 .
        }`)
      })

      it('skips deactivated properties', async () => {
        // given
        const shape = await parse`
          <>
            a ${sh.NodeShape} ;
            ${sh.property}
            [
              ${sh.path} ${foaf.name} ;
              ${sh.deactivated} true ;
            ],
            [
              ${sh.path} ${foaf.lastName} ;
            ] ; 
          .
        `

        // when
        const patterns = shapeToPatterns(shape, { subjectVariable: 'node' })
        const query = SELECT.ALL.WHERE`${patterns}`.build()

        // then
        expect(query).to.be.a.query(sparql`SELECT * WHERE {
          ?node ${foaf.lastName} ?node_0 .
        }`)
      })

      it('combines properties with union when flag is set', async () => {
        // given
        const shape = await parse`
          <>
            a ${sh.NodeShape} ;
            ${sh.property}
            [
              ${sh.path} ${foaf.name} ;
            ],
            [
              ${sh.path} ${foaf.lastName} ;
            ] ; 
          .
        `

        // when
        const patterns = shapeToPatterns(shape, {
          subjectVariable: 'node',
          strict: false,
        })
        const query = SELECT.ALL.WHERE`${patterns}`.build()

        // then
        expect(query).to.be.a.query(sparql`SELECT * WHERE {
          { ?node ${foaf.name} ?node_0 . }
          union
          { ?node ${foaf.lastName} ?node_1 . }
        }`)
      })
    })
  })

  describe('shapeToQuery', () => {
    describe('construct', () => {
      it('generates a query for variable', async () => {
        // given
        const shape = await parse`
          <>
            a ${sh.NodeShape} ;
            ${sh.property}
            [
              ${sh.path} ${foaf.name} ;
            ],
            [
              ${sh.path} ${foaf.lastName} ;
            ] ; 
          .
        `

        // when
        const query = construct(shape, { subjectVariable: 'person' }).build()

        // then
        expect(query).to.be.a.query(sparql`CONSTRUCT {
          ?person ${foaf.name} ?person_0 .
          ?person ${foaf.lastName} ?person_1 .
        } WHERE {
          { ?person ${foaf.name} ?person_0 . }
          union
          { ?person ${foaf.lastName} ?person_1 . }
        }`)
      })

      it('generates a query for IRI node', async () => {
        // given
        const shape = await parse`
          <>
            a ${sh.NodeShape} ;
            ${sh.property}
            [
              ${sh.path} ${foaf.name} ;
            ],
            [
              ${sh.path} ${foaf.lastName} ;
            ] ; 
          .
        `

        // when
        const focusNode = ex.John
        const query = construct(shape, { focusNode }).build()

        // then
        expect(query).to.be.a.query(sparql`CONSTRUCT {
          ${ex.John} ${foaf.name} ?resource_0 .
          ${ex.John} ${foaf.lastName} ?resource_1 .
        } WHERE {
          { ${ex.John} ${foaf.name} ?resource_0 . }
          union
          { ${ex.John} ${foaf.lastName} ?resource_1 . }
        }`)
      })
    })
  })
})

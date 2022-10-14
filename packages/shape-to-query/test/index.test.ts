import { parse } from '@labyrinth/testing/nodeFactory'
import { foaf, sh } from '@tpluscode/rdf-ns-builders'
import { SELECT } from '@tpluscode/sparql-builder'
import { expect } from 'chai'
import { sparql } from '@tpluscode/rdf-string'
import { shapeToPatterns } from '..'
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
          const patterns = shapeToPatterns(shape, 'node')
          const query = SELECT.ALL.WHERE`${patterns}`.build()

          // then
          expect(query).to.be.a.query(sparql`SELECT * WHERE {
            ?node a ${foaf.Person}
          }`)
        })
      })
    })
  })
})

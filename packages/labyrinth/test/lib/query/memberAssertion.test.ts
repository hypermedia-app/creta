import { parse } from '@labyrinth/testing/nodeFactory'
import { hydra, sh } from '@tpluscode/rdf-ns-builders'
import { expect } from 'chai'
import $rdf from 'rdf-ext'
import { ex } from '@labyrinth/testing/namespace'
import { sparql } from '@tpluscode/rdf-string'
import { SELECT } from '@tpluscode/sparql-builder'
import { memberAssertionPatterns } from '../../../lib/query/memberAssertion'
import '@labyrinth/testing/sparql'

describe('@hydrofoil/labyrinth/lib/query/memberAssertion', () => {
  async function testData(...args: Parameters<typeof parse>) {
    const ptr = await parse(...args)

    return ptr.any().has([hydra.subject, hydra.property, hydra.object])
  }

  it('ignores member assertion which is a blank node and has no type', async () => {
    // given
    const assertions = await testData`
      [ 
        ${hydra.object} ${ex.foo} ; ${hydra.subject} [] ;
      ] .
      [ 
        ${hydra.property} ${ex.foo} ; ${hydra.subject} [] ;
      ] .
      [ 
        ${hydra.property} ${ex.foo} ; ${hydra.object} [] ;
      ] .
    `

    // when
    const patterns = memberAssertionPatterns(assertions, $rdf.variable('member'))

    // then
    expect(patterns).to.be.empty
  })

  it('generates shape for Node Shape', async () => {
    // given
    const assertions = await testData`
      [ 
        ${hydra.property} ${ex.foo} ;
        ${hydra.object} [
          a ${sh.NodeShape} ;
          ${sh.targetClass} ${ex.Bar} ;
        ] ;
      ] .
    `

    // when
    const patterns = SELECT.ALL.WHERE`${memberAssertionPatterns(assertions, $rdf.variable('member'))}`

    // then
    await expect(patterns).to.be.a.query(sparql`SELECT * {
      ?member ${ex.foo} ?ma_o0 .
      ?ma_o0 a ${ex.Bar} .
    }`)
  })
})

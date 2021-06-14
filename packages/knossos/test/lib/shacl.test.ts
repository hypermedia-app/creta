import $rdf from 'rdf-ext'
import { foaf, rdf, rdfs, sh } from '@tpluscode/rdf-ns-builders'
import { expect } from 'chai'
import clownface from 'clownface'
import { sparql } from '@tpluscode/rdf-string'
import { ex } from '@labyrinth/testing/namespace'
import { client, testData } from '@labyrinth/testing/client'
import { shapesQuery } from '../../lib/shacl'

describe('@hydrofoil/knossos/lib/shacl', () => {
  it('loads implicit target shapes, incl. superclasses', async () => {
    // given
    await testData(sparql`
      ${ex.Person} a ${rdfs.Class}, ${sh.NodeShape} ;
        ${rdfs.subClassOf} ${ex.Agent} .
        
      ${ex.Agent} a ${sh.NodeShape}, ${rdfs.Class} .
    `)

    // when
    const dataset = await $rdf.dataset().import(await shapesQuery({
      term: ex.person,
      types: [
        ex.Person,
      ],
      sparql: client,
    }))

    // then
    const shapes = clownface({ dataset })
      .has(rdf.type, sh.NodeShape)
      .terms
    expect(shapes).to.deep.contain.members([
      ex.Person,
      ex.Agent,
    ])
  })
  it('loads implicit target shapes, incl. class target superclasses', async () => {
    // given
    await testData(sparql`
      ${ex.Person} a ${rdfs.Class}, ${sh.NodeShape} ;
        ${rdfs.subClassOf} ${ex.Agent} .
        
      ${ex.AgentShape} a ${sh.NodeShape} ; ${sh.targetClass} ${ex.Agent} .
    `)

    // when
    const dataset = await $rdf.dataset().import(await shapesQuery({
      term: ex.person,
      types: [
        ex.Person,
      ],
      sparql: client,
    }))

    // then
    const shapes = clownface({ dataset })
      .has(rdf.type, sh.NodeShape)
      .terms
    expect(shapes).to.deep.contain.members([
      ex.Person,
      ex.AgentShape,
    ])
  })

  it('loads class target shapes', async () => {
    // given
    await testData(sparql`
      ${ex.PersonShape} a ${sh.NodeShape} ;
        ${sh.targetClass} ${ex.Person} .
    `)

    // when
    const dataset = await $rdf.dataset().import(await shapesQuery({
      term: ex.person,
      types: [
        ex.Person,
      ],
      sparql: client,
    }))

    // then
    const shapes = clownface({ dataset })
      .has(rdf.type, sh.NodeShape)
      .terms
    expect(shapes).to.deep.contain.members([
      ex.PersonShape,
    ])
  })

  it('loads class target shapes, incl. superclasses', async () => {
    // given
    await testData(sparql`
      ${ex.ChildShape} a ${sh.NodeShape} ;
        ${sh.targetClass} ${ex.Child} .
        
      ${ex.Child} ${rdfs.subClassOf} ${ex.Person} .
      ${ex.PersonShape} a ${sh.NodeShape} ; ${sh.targetClass} ${ex.Person} .
        
      ${ex.Person} ${rdfs.subClassOf} ${ex.Agent} .
      ${ex.Agent} a ${sh.NodeShape} , ${rdfs.Class} .
    `)

    // when
    const dataset = await $rdf.dataset().import(await shapesQuery({
      term: ex.child,
      types: [
        ex.Child,
      ],
      sparql: client,
    }))

    // then
    const shapes = clownface({ dataset })
      .has(rdf.type, sh.NodeShape)
      .terms
    expect(shapes).to.deep.contain.members([
      ex.ChildShape,
      ex.PersonShape,
      ex.Agent,
    ])
  })

  it('loads node target shapes', async () => {
    // given
    await testData(sparql`
      ${ex.JohnShape} a ${sh.NodeShape} ;
        ${sh.targetNode} ${ex.john} .
    `)

    // when
    const dataset = await $rdf.dataset().import(await shapesQuery({
      term: ex.john,
      types: [
        foaf.Person,
      ],
      sparql: client,
    }))

    // then
    const shapes = clownface({ dataset })
      .has(rdf.type, sh.NodeShape)
      .terms
    expect(shapes).to.deep.contain.members([
      ex.JohnShape,
    ])
  })
})

import $rdf from 'rdf-ext'
import { foaf, hydra, rdf, rdfs, sh } from '@tpluscode/rdf-ns-builders'
import { expect } from 'chai'
import clownface from 'clownface'
import { sparql } from '@tpluscode/rdf-string'
import { ex } from '@labyrinth/testing/namespace'
import { client, testData } from '@labyrinth/testing/client'
import { shapesQuery } from '../../lib/shacl'

describe('@hydrofoil/knossos/lib/shacl', () => {
  const api = ex.Api

  it('loads implicit target shapes, incl. superclasses', async () => {
    // given
    await testData(sparql`
      ${ex.Person} a ${rdfs.Class}, ${sh.NodeShape} ;
        ${rdfs.subClassOf} ${ex.Agent} ;
        ${hydra.apiDocumentation} ${api} .
        
      ${ex.Agent} a ${sh.NodeShape}, ${rdfs.Class} ;
        ${hydra.apiDocumentation} ${api}.
        
      ${ex.OtherApiAgent} a ${sh.NodeShape}, ${rdfs.Class} .
    `)

    // when
    const dataset = await $rdf.dataset().import(await shapesQuery({
      term: ex.person,
      types: [
        ex.Person,
      ],
      sparql: client,
      api,
    }))

    // then
    const shapes = clownface({ dataset })
      .has(rdf.type, sh.NodeShape)
      .terms
    expect(shapes).to.deep.contain.members([
      ex.Person,
      ex.Agent,
    ])
    expect(shapes).not.to.deep.contain.members([
      ex.OtherApiAgent,
    ])
  })

  it('loads implicit target shapes, incl. class target superclasses', async () => {
    // given
    await testData(sparql`
      ${ex.Person} a ${rdfs.Class}, ${sh.NodeShape} ;
        ${rdfs.subClassOf} ${ex.Agent} ;
        ${hydra.apiDocumentation} ${api} .
        
      ${ex.AgentShape} a ${sh.NodeShape} ; ${sh.targetClass} ${ex.Agent} ;
        ${hydra.apiDocumentation} ${api}.
        
      ${ex.OtherApiAgentShape} a ${sh.NodeShape} ; ${sh.targetClass} ${ex.Agent} .
    `)

    // when
    const dataset = await $rdf.dataset().import(await shapesQuery({
      term: ex.person,
      types: [
        ex.Person,
      ],
      sparql: client,
      api,
    }))

    // then
    const shapes = clownface({ dataset })
      .has(rdf.type, sh.NodeShape)
      .terms
    expect(shapes).to.deep.contain.members([
      ex.Person,
      ex.AgentShape,
    ])
    expect(shapes).not.to.deep.contain.members([
      ex.OtherApiAgentShape,
    ])
  })

  it('loads class target shapes', async () => {
    // given
    await testData(sparql`
      ${ex.PersonShape} a ${sh.NodeShape} ;
        ${sh.targetClass} ${ex.Person} ;
        ${hydra.apiDocumentation} ${api} .
      
      ${ex.OtherApiPersonShape} a ${sh.NodeShape} ;
        ${sh.targetClass} ${ex.Person} .
    `)

    // when
    const dataset = await $rdf.dataset().import(await shapesQuery({
      term: ex.person,
      types: [
        ex.Person,
      ],
      sparql: client,
      api,
    }))

    // then
    const shapes = clownface({ dataset })
      .has(rdf.type, sh.NodeShape)
      .terms
    expect(shapes).to.deep.contain.members([
      ex.PersonShape,
    ])
    expect(shapes).not.to.deep.contain.members([
      ex.OtherApiPersonShape,
    ])
  })

  it('loads class target shapes, incl. superclasses', async () => {
    // given
    await testData(sparql`
      ${ex.ChildShape} a ${sh.NodeShape} ;
        ${sh.targetClass} ${ex.Child} ;
        ${hydra.apiDocumentation} ${api}.
        
      ${ex.Child} ${rdfs.subClassOf} ${ex.Person} .
      ${ex.PersonShape} a ${sh.NodeShape} ; ${sh.targetClass} ${ex.Person} ;
        ${hydra.apiDocumentation} ${api}.
        
      ${ex.Person} ${rdfs.subClassOf} ${ex.Agent} .
      ${ex.Agent} a ${sh.NodeShape} , ${rdfs.Class} ;
        ${hydra.apiDocumentation} ${api}.
        
      ${ex.OtherApiPersonShape} a ${sh.NodeShape} ; ${sh.targetClass} ${ex.Person} .
      ${ex.OtherApiAgent} a ${sh.NodeShape} , ${rdfs.Class} .
    `)

    // when
    const dataset = await $rdf.dataset().import(await shapesQuery({
      term: ex.child,
      types: [
        ex.Child,
      ],
      sparql: client,
      api,
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
    expect(shapes).not.to.deep.contain.members([
      ex.OtherApiPersonShape,
      ex.OtherApiAgent,
    ])
  })

  it('loads node target shapes', async () => {
    // given
    await testData(sparql`
      ${ex.JohnShape} a ${sh.NodeShape} ;
        ${sh.targetNode} ${ex.john} ;
        ${hydra.apiDocumentation} ${api} .
      
      ${ex.OtherApiJohnShape} a ${sh.NodeShape} ;
        ${sh.targetNode} ${ex.john} .
    `)

    // when
    const dataset = await $rdf.dataset().import(await shapesQuery({
      term: ex.john,
      types: [
        foaf.Person,
      ],
      sparql: client,
      api,
    }))

    // then
    const shapes = clownface({ dataset })
      .has(rdf.type, sh.NodeShape)
      .terms
    expect(shapes).to.deep.contain.members([
      ex.JohnShape,
    ])
    expect(shapes).not.to.deep.contain.members([
      ex.OtherApiJohnShape,
    ])
  })
})

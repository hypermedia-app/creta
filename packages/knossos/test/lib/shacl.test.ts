import $rdf from 'rdf-ext'
import { foaf, hydra, rdf, rdfs, sh } from '@tpluscode/rdf-ns-builders'
import { expect } from 'chai'
import clownface from 'clownface'
import { ex } from '@labyrinth/testing/namespace'
import { client, testData } from '@labyrinth/testing/client'
import { shapesQuery } from '../../lib/shacl'

describe('@hydrofoil/knossos/lib/shacl', () => {
  const api = ex.Api

  it('loads implicit target shapes, incl. superclasses', async () => {
    // given
    await testData`
      ${ex.Person} a ${rdfs.Class}, ${sh.NodeShape} ;
        ${rdfs.subClassOf} ${ex.Agent} ;
        ${hydra.apiDocumentation} ${api} .
        
      ${ex.Agent} a ${sh.NodeShape}, ${rdfs.Class} ;
        ${hydra.apiDocumentation} ${api}.
        
      ${ex.OtherApiAgent} a ${sh.NodeShape}, ${rdfs.Class} .
    `

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
    await testData`
      ${ex.Person} a ${rdfs.Class}, ${sh.NodeShape} ;
        ${rdfs.subClassOf} ${ex.Agent} ;
        ${hydra.apiDocumentation} ${api} .
        
      ${ex.AgentShape} a ${sh.NodeShape} ; ${sh.targetClass} ${ex.Agent} ;
        ${hydra.apiDocumentation} ${api}.
        
      ${ex.OtherApiAgentShape} a ${sh.NodeShape} ; ${sh.targetClass} ${ex.Agent} .
    `

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
    await testData`
      ${ex.PersonShape} a ${sh.NodeShape} ;
        ${sh.targetClass} ${ex.Person} ;
        ${hydra.apiDocumentation} ${api} .
      
      ${ex.OtherApiPersonShape} a ${sh.NodeShape} ;
        ${sh.targetClass} ${ex.Person} .
    `

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
    await testData`
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
    `

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
    await testData`
      ${ex.JohnShape} a ${sh.NodeShape} ;
        ${sh.targetNode} ${ex.john} ;
        ${hydra.apiDocumentation} ${api} .
      
      ${ex.OtherApiJohnShape} a ${sh.NodeShape} ;
        ${sh.targetNode} ${ex.john} .
    `

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

  describe('nested shapes', () => {
    beforeEach(async () => {
      await testData`
        ${ex.Person}
          a ${sh.NodeShape} ;
          ${hydra.apiDocumentation} ${api} ;
          ${sh.targetClass} ${foaf.Person} ;
          ${sh.and} ( ${ex.Agent} ) ;
          ${sh.property} [
            ${sh.path} ${foaf.knows} ;
            ${sh.node} ${ex.Friend} ;
            ${sh.not} ( ${ex.SuspendedAgent} ) ;
          ] ;
        .
        
        ${ex.Organization}
          a ${sh.NodeShape} ;
          ${hydra.apiDocumentation} ${api} ;
          ${sh.targetClass} ${foaf.Organization} ;
          ${sh.and} ( ${ex.Agent} ) ;
          ${sh.property} [
            ${sh.path} ${foaf.accountName} ;
          ] ;
        .
        
        ${ex.SuspendedAgent}
          a ${sh.NodeShape} ;
          ${sh.property} [
            ${sh.path} ${foaf.status} ;
            ${sh.hasValue} "SUSPENDED" ;
          ] ;
        .
        
        ${ex.Agent}
          a ${sh.NodeShape} ;
          ${sh.property} [
            ${sh.path} ${foaf.name} ;
          ] ;
        .
        
        ${ex.Friend}
          a ${sh.NodeShape} ;
        .
        
        ${ex.PersonOrOrganization}
          a ${rdfs.Class} , ${sh.NodeShape} ;
          ${hydra.apiDocumentation} ${api} ;
          ${sh.xone} (
            ${ex.Person} ${ex.Organization}
          ) ;
        .
      `
    })

    it('loads directly nested sh:and', async () => {
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
      const agentPaths = shapes.node(ex.Agent).out(sh.property).has(sh.path, foaf.name)
      expect(agentPaths.terms).to.have.length.gt(0)
    })

    it('loads sh:node of direct properties', async () => {
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
      const friendShapeTypes = shapes.node(ex.Friend).out(rdf.type).terms
      expect(friendShapeTypes).to.deep.contain(sh.NodeShape)
    })

    it('loads deeply nested shape', async () => {
      // when
      const dataset = await $rdf.dataset().import(await shapesQuery({
        term: ex.foo,
        types: [
          ex.PersonOrOrganization,
        ],
        sparql: client,
        api,
      }))

      // then
      const shapes = clownface({ dataset })
      const agentPaths = shapes.node(ex.Agent).out(sh.property).has(sh.path, foaf.name)
      expect(agentPaths.terms).to.have.length.gt(0)
    })

    it('loads deeply nested property sh:node shape', async () => {
      // when
      const dataset = await $rdf.dataset().import(await shapesQuery({
        term: ex.foo,
        types: [
          ex.PersonOrOrganization,
        ],
        sparql: client,
        api,
      }))

      // then
      const shapes = clownface({ dataset })
      const friendShapeTypes = shapes.node(ex.Friend).out(rdf.type).terms
      expect(friendShapeTypes).to.deep.contain(sh.NodeShape)
    })

    it('loads deeply nested property sh:not shape', async () => {
      // when
      const dataset = await $rdf.dataset().import(await shapesQuery({
        term: ex.foo,
        types: [
          ex.PersonOrOrganization,
        ],
        sparql: client,
        api,
      }))

      // then
      const shapes = clownface({ dataset })
      const nestedShapeTypes = shapes.node(ex.SuspendedAgent).out(rdf.type).terms
      expect(nestedShapeTypes).to.deep.contain(sh.NodeShape)
    })
  })
})

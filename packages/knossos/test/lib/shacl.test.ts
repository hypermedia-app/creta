import StreamClient from 'sparql-http-client/StreamClient'
import $rdf from 'rdf-ext'
import { foaf, rdf, rdfs, sh } from '@tpluscode/rdf-ns-builders'
import { expect } from 'chai'
import clownface from 'clownface'
import { DELETE, INSERT } from '@tpluscode/sparql-builder'
import type { SparqlTemplateResult } from '@tpluscode/rdf-string'
import { sparql } from '@tpluscode/rdf-string'
import { ex } from '@labyrinth/testing/namespace'
import { shapesQuery } from '../../lib/shacl'

describe('@hydrofoil/knossos/lib/shacl', () => {
  const client = new StreamClient({
    endpointUrl: 'http://db.labyrinth.lndo.site/repositories/tests?infer=true',
    updateUrl: 'http://db.labyrinth.lndo.site/repositories/tests',
    user: 'minos',
    password: 'password',
  })

  function testData(dataset: SparqlTemplateResult) {
    const del = DELETE`?s ?p ?o`.WHERE`?s ?p ?o`
    const insert = INSERT.DATA`${dataset}`

    const query = sparql`${del};${insert}`

    return client.query.update(query.toString())
  }

  it('loads implicit target shapes, incl. superclasses', async () => {
    // given
    await testData(sparql`
      ${ex.Person} a ${rdfs.Class}, ${sh.NodeShape} ;
        ${rdfs.subClassOf} ${ex.Agent} .
        
      ${ex.Agent} a ${sh.NodeShape} .
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

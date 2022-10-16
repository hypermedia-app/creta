import { Stream } from 'rdf-js'
import sinon from 'sinon'
import $rdf from 'rdf-ext'
import clownface from 'clownface'
import express from 'express'
import { expect } from 'chai'
import { hydraBox } from '@labyrinth/testing/hydra-box'
import { client } from '@labyrinth/testing/sparql'
import { code, hyper_query } from '@hydrofoil/vocabularies/builders'
import { rdf } from '@tpluscode/rdf-ns-builders'
import { ex } from '@labyrinth/testing/namespace'
import { loadRepresentation } from '../../../lib/query/resource'

describe('@hydrofoil/labyrinth/lib/query/resource', () => {
  let loadFunction: ReturnType<typeof loadRepresentation>
  let defaultStrat: () => () => Promise<Stream>
  let req: Pick<express.Request, 'hydra' | 'labyrinth'>
  let loader: sinon.SinonStub

  beforeEach(async () => {
    const hydra = await hydraBox()
    loader = hydra.api.loaderRegistry.load as any
    const labyrinth = {
      sparql: client(),
    } as any
    req = {
      hydra,
      labyrinth,
    }
    defaultStrat = sinon.stub().returns(() => $rdf.dataset().toStream())
    loadFunction = loadRepresentation(req, defaultStrat)
  })

  it('uses default strategy', async () => {
    // when
    await loadFunction()

    // then
    expect(defaultStrat).to.have.been.called
  })

  it('uses given strategy when set on resource', async () => {
    // given
    const describe = sinon.stub().resolves($rdf.dataset().toStream())
    loader.resolves(() => describe)
    const resource = await req.hydra.resource.clownface()
    resource.addOut(hyper_query.describeStrategy, ds => ds.addOut(code.implementedBy))

    // when
    await loadFunction()

    // then
    expect(defaultStrat).not.to.have.been.called
    expect(describe).to.have.been.called
  })

  it('uses given strategy when set on resource type', async () => {
    // given
    const describe = sinon.stub().resolves($rdf.dataset().toStream())
    loader.resolves(() => describe)
    const resource = await req.hydra.resource.clownface()
    resource.addOut(rdf.type, ex.Foo)
    clownface(req.hydra.api)
      .node(ex.Foo)
      .addOut(hyper_query.describeStrategy, ds => ds.addOut(code.implementedBy))

    // when
    await loadFunction()

    // then
    expect(defaultStrat).not.to.have.been.called
    expect(describe).to.have.been.called
  })
})

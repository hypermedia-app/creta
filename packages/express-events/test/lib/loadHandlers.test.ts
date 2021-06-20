import type { StreamClient } from 'sparql-http-client/StreamClient'
import express from 'express'
import { Activity } from '@rdfine/as'
import sinon from 'sinon'
import { expect } from 'chai'
import { fromPointer } from '@rdfine/as/lib/Activity'
import { blankNode } from '@labyrinth/testing/nodeFactory'
import DatasetExt from 'rdf-ext/lib/Dataset'
import $rdf from 'rdf-ext'
import clownface, { AnyContext, AnyPointer } from 'clownface'
import { code } from '@hydrofoil/vocabularies/builders'
import { ex } from '@labyrinth/testing/namespace'
import { loadHandlers } from '../../lib/loadHandlers'

describe('@hydrofoil/express-events/lib/loadHandlers', () => {
  let sparql: sinon.SinonStubbedInstance<Pick<StreamClient, 'query'>>
  let req: any
  let activity: Activity
  let dataset: AnyPointer<AnyContext, DatasetExt>

  beforeEach(() => {
    dataset = clownface({ dataset: $rdf.dataset() })
    activity = fromPointer(blankNode())
    sparql = {
      query: {
        construct: sinon.stub().callsFake(() => dataset.dataset.toStream()),
      } as any,
    }

    req = {
      loadCode: sinon.stub(),
      labyrinth: {
        sparql,
      },
      knossos: {
        log: sinon.spy() as any,
      },
      hydra: {
        api: {
          term: ex.api,
        },
      },
    } as RecursivePartial<express.Request>
  })

  afterEach(() => {
    sinon.restore()
  })

  it('skips handlers which fail to load', async () => {
    // given
    dataset.blankNode()
      .addOut(code.implementedBy, dataset.blankNode())
    req.loadCode.returns(null)

    // when
    const handlers = await loadHandlers(req, activity)

    // then
    expect(handlers).to.have.length(0)
  })

  it('skips handlers which have no implementation', async () => {
    // given
    dataset.blankNode()
      .addOut(code.implementedBy, dataset.blankNode())
    dataset.blankNode()
      .addOut(code.implementedByButWithTypo, dataset.blankNode())
    req.loadCode.onFirstCall().returns(() => ({}))

    // when
    const handlers = await loadHandlers(req, activity)

    // then
    expect(handlers).to.have.length(1)
  })

  it('skips handlers which have multiple implementations', async () => {
    // given
    dataset.blankNode()
      .addOut(code.implementedBy, dataset.blankNode())
      .addOut(code.implementedBy, dataset.blankNode())
    req.loadCode.returns(() => ({}))

    // when
    const handlers = await loadHandlers(req, activity)

    // then
    expect(handlers).to.have.length(0)
  })

  it('resolves all implemented handlers', async () => {
    // given
    dataset.blankNode()
      .addOut(code.implementedBy, dataset.blankNode())
    dataset.blankNode()
      .addOut(code.implementedBy, dataset.blankNode())
    dataset.blankNode()
      .addOut(code.implementedBy, dataset.blankNode())
    req.loadCode.returns(() => ({}))

    // when
    const handlers = await loadHandlers(req, activity)

    // then
    expect(handlers).to.have.length(3)
  })
})

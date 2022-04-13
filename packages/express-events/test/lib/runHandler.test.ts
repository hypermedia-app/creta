import sinon from 'sinon'
import { expect } from 'chai'
import { blankNode } from '@labyrinth/testing/nodeFactory'
import { fromPointer } from '@rdfine/as/lib/Activity'
import express from 'express'
import { runHandler } from '../../lib/runHandler'

describe('@hydrofoil/express-events/lib/runHandler', () => {
  let req: express.Request

  beforeEach(() => {
    req = {
      knossos: {
        log: sinon.spy(),
      },
    } as any
  })

  it('does nothing if already ran', async () => {
    // given
    const handler = {
      impl: sinon.spy(),
      handled: true,
      pointer: blankNode(),
    }
    const activity = fromPointer(blankNode())

    // when
    await runHandler(req, handler, activity)

    // then
    expect(handler.impl).not.to.have.been.called
  })

  it('calls implementation', async () => {
    // given
    const handler = {
      impl: sinon.spy(),
      pointer: blankNode(),
    }
    const activity = fromPointer(blankNode())

    // when
    await runHandler(req, handler, activity)

    // then
    expect(handler.impl).to.have.been.calledWith(sinon.match({
      event: activity,
      req,
    }))
  })
})

import sinon from 'sinon'
import { fromPointer } from '@rdfine/as/lib/Activity'
import { blankNode } from '@labyrinth/testing/nodeFactory'
import { expect } from 'chai'
import { hyper_events } from '@hydrofoil/vocabularies/builders/strict'
import debug from 'debug'
import { ActivityQueue, Loader, Runner } from '../../lib/ActivityQueue'

describe('@hydrofoil/express-events/lib/ActivityQueue', () => {
  const logger = debug('test')
  logger.enabled = true

  let queue: ActivityQueue
  let loader: sinon.SinonStub<Parameters<Loader>, ReturnType<Loader>>
  let runner: sinon.SinonStub<Parameters<Runner>, ReturnType<Runner>>
  let store: sinon.SinonSpy

  beforeEach(() => {
    /* eslint-disable no-console */
    loader = sinon.stub()
    runner = sinon.stub()
    store = sinon.stub().resolves(undefined)
    queue = new ActivityQueue({
      logger,
      loader,
      runner,
      store,
    })
  })

  describe('when immediate handler returns more immediate handlers', () => {
    it('runs them all immediately', async () => {
      // given
      loader.onFirstCall().resolves([{
        pointer: blankNode().addOut(hyper_events.immediate, true),
        impl: sinon.spy(),
      }])
      loader.onSecondCall().resolves([{
        pointer: blankNode().addOut(hyper_events.immediate, true),
        impl: sinon.spy(),
      }, {
        pointer: blankNode().addOut(hyper_events.immediate, false),
        impl: sinon.spy(),
      }])
      runner.resolves([fromPointer(blankNode())])

      // when
      queue.addActivity(fromPointer(blankNode()))
      await queue.runImmediateHandlers()
      await queue.saveEvents()

      // then
      expect(runner).to.have.been.calledTwice
      expect(store).to.have.been.calledThrice
    })
  })
})

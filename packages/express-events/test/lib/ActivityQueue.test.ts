import sinon from 'sinon'
import { fromPointer } from '@rdfine/as/lib/Activity'
import { blankNode } from '@labyrinth/testing/nodeFactory'
import { expect } from 'chai'
import { hyper_events } from '@hydrofoil/vocabularies/builders/strict'
import debug from 'debug'
import { nanoid } from 'nanoid'
import $rdf from 'rdf-ext'
import { GraphPointer } from 'clownface'
import { as } from '@tpluscode/rdf-ns-builders/strict'
import { ActivityQueue, Loader, Runner } from '../../lib/ActivityQueue'

describe('@hydrofoil/express-events/lib/ActivityQueue', () => {
  const logger = debug('test')
  logger.enabled = true

  const actor = $rdf.namedNode('actor')

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
      actor,
      logger,
      loader,
      runner,
      store,
      activityId: () => $rdf.namedNode(nanoid()),
    })
  })

  it('does nothing when there are no activities', async () => {
    // when
    await queue.runImmediateHandlers()
    await queue.runRemainingHandlers()
    await queue.saveEvents()

    // then
    expect(loader).not.to.have.been.called
    expect(runner).not.to.have.been.called
    expect(store).not.to.have.been.called
  })

  it('sets as:actor and as:published of events', async () => {
    // given
    queue.addActivity({})

    // when
    await queue.saveEvents()

    // then
    expect(store).to.have.been.calledWith(sinon.match((value: GraphPointer) => {
      return value.out(as.actor).term?.equals(actor) && !!value.out(as.published).term
    }))
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

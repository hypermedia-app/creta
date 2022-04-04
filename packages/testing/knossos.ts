import express from 'express'
import sinon from 'sinon'
import type { Knossos } from '@hydrofoil/knossos'
import debug, { Debugger } from 'debug'
import type { Events } from '@hydrofoil/knossos-events'
import { GraphPointer } from 'clownface'
import { blankNode } from './nodeFactory'

export interface KnossosMock {
  log: Debugger
  store: sinon.SinonStubbedInstance<Knossos['store']>
  events: sinon.SinonStubbedInstance<Events>
  config: GraphPointer
}

export const knossosMock = (app: express.IRouter): KnossosMock => {
  const events = []
  const knossos: any = {
    store: {
      save: sinon.stub(),
      load: sinon.stub(),
      exists: sinon.stub(),
      delete: sinon.stub(),
    },
    log: debug('test'),
    events: sinon.stub().callsFake(function (event) {
      events.push(event)
    }),
    config: blankNode(),
  }

  knossos.events.handleImmediate = sinon.spy()

  app.use((req, res, next) => {
    req.knossos = knossos
    res.event = knossos.events
    next()
  })

  return knossos
}

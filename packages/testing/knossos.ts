import express from 'express'
import sinon from 'sinon'
import type { Knossos } from '@hydrofoil/knossos'
import debug, { Debugger } from 'debug'
import type { Events } from '@hydrofoil/knossos-events'

export interface KnossosMock {
  log: Debugger
  store: sinon.SinonStubbedInstance<Knossos['store']>
  events: sinon.SinonStubbedInstance<Events>
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
  }

  knossos.events.handleImmediate = sinon.spy()

  app.use((req, res, next) => {
    req.knossos = knossos
    res.event = knossos.events
    next()
  })

  return knossos
}

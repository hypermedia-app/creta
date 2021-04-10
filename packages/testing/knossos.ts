import express from 'express'
import sinon from 'sinon'
import type { Knossos } from '@hydrofoil/knossos/server'
import debug, { Debugger } from 'debug'

export interface KnossosMock {
  log: Debugger
  store: sinon.SinonStubbedInstance<Knossos['store']>
}

export const knossosMock = (app: express.IRouter): KnossosMock => {
  const knossos: any = {
    store: {
      save: sinon.stub(),
      load: sinon.stub(),
      exists: sinon.stub(),
      delete: sinon.stub(),
    },
    log: debug('test'),
  }

  app.use((req, res, next) => {
    req.knossos = knossos
    next()
  })

  return knossos
}

import express from 'express'
import sinon from 'sinon'
import type { Knossos } from '@hydrofoil/knossos/server'
import debug from 'debug'

export function knossosMock(knossos: Knossos): express.RequestHandler {
  return (req, res, next) => {
    knossos.store = {
      save: sinon.spy(),
      load: sinon.spy(),
      exists: sinon.spy(),
      delete: sinon.spy(),
    }
    knossos.log = debug('test')

    req.knossos = knossos

    next()
  }
}

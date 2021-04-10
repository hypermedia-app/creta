import express from 'express'
import sinon from 'sinon'
import type { Events } from '@hydrofoil/knossos-events'

export const eventMocks: express.RequestHandler = (req, res, next) => {
  const event: Events = sinon.spy() as any
  event.handleImmediate = sinon.spy()

  res.event = event

  next()
}

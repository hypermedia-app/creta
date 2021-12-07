import express from 'express'

export function getPayload(req: express.Request) {
  return typeof req.dataset === 'function' ? req.resource() : undefined
}

export function getRepresentation(req: express.Request) {
  return req.hydra.resource ? req.hydra.resource.clownface() : undefined
}

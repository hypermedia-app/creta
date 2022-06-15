import express from 'express'
import parsePreferHeader from 'parse-prefer-header'

export function getPayload(req: express.Request) {
  return typeof req.dataset === 'function' ? req.resource() : undefined
}

export function getRepresentation(req: express.Request) {
  return req.hydra.resource ? req.hydra.resource.clownface() : undefined
}

export function prefersMinimal(req: express.Request): boolean {
  const prefer = parsePreferHeader(req.header('Prefer'))
  return prefer.return === 'minimal'
}

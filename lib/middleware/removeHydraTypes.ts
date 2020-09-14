import { RequestHandler } from 'express'
import clownface from 'clownface'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'

export const removeHydraTypes: RequestHandler = (req, res, next) => {
  const pointer = clownface(req.hydra.resource)
  const api = clownface(req.hydra.api)

  const types = api.node(pointer.out(rdf.type).terms)
  const supportedOperationClasses = types
    .out(hydra.supportedOperation)
    .has(hydra.method, 'GET')
    .in(hydra.supportedOperation)
    .terms

  if (supportedOperationClasses.some(term => !term.equals(hydra.Resource))) {
    req.hydra.resource.types.delete(hydra.Resource)
  }

  next()
}

import { protectedResource } from '@hydrofoil/labyrinth/resource'
import asyncMiddleware from 'middleware-async'
import clownface, { AnyPointer, GraphPointer } from 'clownface'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import error from 'http-errors'
import httpStatus from 'http-status'
import { Debugger } from 'debug'
import { ResourceStore } from './lib/store'
import { shaclValidate } from './lib/shacl'
import { knossos } from './lib/namespace'

declare module 'express-serve-static-core' {
  interface Request {
    knossos: {
      store: ResourceStore
      log: Debugger
    }
  }
}

function canBeCreateWithPut(api: AnyPointer, resource: GraphPointer) {
  const types = resource.out(rdf.type)
  const classes = api.has(hydra.supportedClass, types).out(hydra.supportedClass)

  const anyClassAllowsPut = classes.has(knossos.createWithPUT, true).terms.length > 0
  const noClassForbidsPut = classes.has(knossos.createWithPUT, false).terms.length === 0

  return anyClassAllowsPut && noClassForbidsPut
}

export const PUT = protectedResource(shaclValidate, asyncMiddleware(async (req, res, next) => {
  const api = clownface(req.hydra.api)
  const resource = await req.resource()
  const exists = await req.knossos.store.exists(resource.term)

  if (!exists) {
    if (!canBeCreateWithPut(api, resource)) {
      return next(new error.MethodNotAllowed())
    }
  }

  await req.knossos.store.save(resource)

  const updated = await req.knossos.store.load(resource.term)
  return res.resource(updated)
}))

export const DELETE = protectedResource(asyncMiddleware(async (req, res) => {
  await req.knossos.store.delete(req.hydra.resource.term)

  return res.sendStatus(httpStatus.NO_CONTENT)
}))

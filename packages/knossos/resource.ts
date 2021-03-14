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
import guard from 'express-jwt-permissions'
import { auth } from '@hydrofoil/labyrinth/lib/namespace'

declare module 'express-serve-static-core' {
  interface Request {
    knossos: {
      store: ResourceStore
      log: Debugger
    }
  }
}

function canBeCreatedWithPut(api: AnyPointer, resource: GraphPointer) {
  const types = resource.out(rdf.type)
  const classes = api.has(hydra.supportedClass, types).out(hydra.supportedClass)

  const anyClassAllowsPut = classes.has(knossos.createWithPUT, true).terms.length > 0
  const noClassForbidsPut = classes.has(knossos.createWithPUT, false).terms.length === 0

  return anyClassAllowsPut && noClassForbidsPut
}

const saveResource = asyncMiddleware(async (req, res) => {
  const resource = await req.resource()

  await req.knossos.store.save(resource)

  const updated = await req.knossos.store.load(resource.term)
  return res.resource(updated)
})

const ensureNotExists = asyncMiddleware(async (req, res, next) => {
  const api = clownface(req.hydra.api)
  const resource = await req.resource()
  const exists = await req.knossos.store.exists(resource.term)

  if (exists || !canBeCreatedWithPut(api, resource)) {
    return next(new error.MethodNotAllowed())
  }

  next()
})
const checkPermissions = asyncMiddleware(async (req, res, next) => {
  req.knossos.log('Checking type restrictions')
  const scope = guard({
    permissionsProperty: 'groups',
  })

  const api = clownface(req.hydra.api)
  const types = (await req.resource()).out(rdf.type)

  req.knossos.log(types.values)
  const groups = api.node(types)
    .out(hydra.supportedOperation)
    .has(hydra.method, 'PUT')
    .out(auth.permissions)
    .values

  if (groups.length) {
    if (!req.user) {
      return next(new error.Unauthorized())
    }

    req.knossos.log('Require groups %o', groups)
    return scope.check(groups)(req, res, next)
  }

  req.knossos.log('Resource types unrestricted')
  next()
})

export const create = protectedResource(ensureNotExists, checkPermissions, shaclValidate, saveResource)

export const PUT = protectedResource(shaclValidate, saveResource)

export const DELETE = protectedResource(asyncMiddleware(async (req, res) => {
  await req.knossos.store.delete(req.hydra.resource.term)

  return res.sendStatus(httpStatus.NO_CONTENT)
}))

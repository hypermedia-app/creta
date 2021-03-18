import asyncMiddleware from 'middleware-async'
import clownface, { AnyPointer, GraphPointer } from 'clownface'
import { acl, hydra, rdf } from '@tpluscode/rdf-ns-builders'
import { StreamClient } from 'sparql-http-client/StreamClient'
import error from 'http-errors'
import httpStatus from 'http-status'
import { Debugger } from 'debug'
import { ResourceStore } from './lib/store'
import { shaclValidate } from './lib/middleware/shacl'
import { knossos } from './lib/namespace'
import { Router } from 'express'
import { check } from 'hydra-box-middleware-wac'
import { save } from './lib/resource'

export interface Knossos {
  store: ResourceStore
  log: Debugger
}

declare module 'express-serve-static-core' {
  interface Request {
    knossos: Knossos
  }
}

function canBeCreatedWithPut(api: AnyPointer, resource: GraphPointer) {
  const types = resource.out(rdf.type)
  const classes = api.has(hydra.supportedClass, types).out(hydra.supportedClass)

  const anyClassAllowsPut = classes.has(knossos.createWithPUT, true).terms.length > 0
  const noClassForbidsPut = classes.has(knossos.createWithPUT, false).terms.length === 0

  return anyClassAllowsPut && noClassForbidsPut
}

const saveResource = ({ locationHeader }: { locationHeader: boolean }) => asyncMiddleware(async (req, res) => {
  const resource = await req.resource()

  await save({ resource, req })

  if (locationHeader) {
    res.setHeader('Location', resource.value)
  }

  return res.resource(resource)
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

const checkPermissions = (client: StreamClient) => asyncMiddleware(async (req, res, next) => {
  req.knossos.log('Checking type restrictions')

  const types = (await req.resource()).out(rdf.type).terms
  const error = await check({
    types,
    accessMode: acl.Control,
    client,
    agent: req.user?.pointer,
  })

  if (error) {
    return next(error)
  }

  req.knossos.log('Resource types unrestricted')
  next()
})

export const create = (client: StreamClient) => Router().use(ensureNotExists, checkPermissions(client), shaclValidate, saveResource({ locationHeader: true }))

export const PUT = Router().use(shaclValidate, saveResource({ locationHeader: false }))

export const DELETE = Router().use(asyncMiddleware(async (req, res) => {
  await req.knossos.store.delete(req.hydra.resource.term)

  return res.sendStatus(httpStatus.NO_CONTENT)
}))

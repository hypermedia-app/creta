import asyncMiddleware from 'middleware-async'
import clownface from 'clownface'
import { created, updated } from '@hydrofoil/knossos-events/activity'
import { sendResponse } from '@hydrofoil/labyrinth/lib/middleware'
import { as, acl, rdf } from '@tpluscode/rdf-ns-builders/loose'
import { StreamClient } from 'sparql-http-client/StreamClient'
import httpStatus from 'http-status'
import { Router } from 'express'
import { check } from 'rdf-web-access-control'
import httpError from 'http-errors'
import { attach } from 'express-rdf-request'
import { shaclValidate } from './shacl'
import { canBeCreatedWithPut, save } from './lib/resource'
import '@hydrofoil/labyrinth'

const saveResource = ({ create }: { create: boolean }) => asyncMiddleware(async (req, res, next) => {
  const resource = await req.resource()

  await save({ resource, req })

  if (create) {
    res.event(created(resource.term))

    res.status(httpStatus.CREATED)
    res.setHeader('Location', resource.value)
  } else {
    res.event(updated(resource.term))
  }

  await res.event.handleImmediate()

  const loaded = await req.knossos.store.load(resource.term)
  sendResponse(loaded.dataset)(req, res, next)
})

const ensureNotExists = asyncMiddleware(async (req, res, next) => {
  await attach(req, res)

  const api = clownface(req.hydra.api)
  const resource = await req.resource()
  const exists = await req.knossos.store.exists(resource.term)

  if (exists) {
    req.knossos.log('Resource <%s> already exists', resource.term)
    return next(new httpError.Conflict())
  }

  if (!canBeCreatedWithPut(api, resource, req.knossos.log)) {
    return next(new httpError.MethodNotAllowed())
  }

  req.knossos.log('Ok')
  next()
})

const checkPermissions = (client: StreamClient) => asyncMiddleware(async (req, res, next) => {
  req.knossos.log('Checking type restrictions')

  const types = (await req.resource()).out(rdf.type).terms
  const accessGranted = await check({
    types,
    accessMode: acl.Create,
    client,
    agent: req.agent,
  })

  if (!accessGranted) {
    return next(new httpError.Forbidden())
  }

  req.knossos.log('Resource types unrestricted')
  next()
})

export const create = (client: StreamClient) => Router()
  .use(ensureNotExists)
  .use(checkPermissions(client))
  .use(shaclValidate())
  .use(saveResource({ create: true }))

export const PUT = Router()
  .use(shaclValidate())
  .use(saveResource({ create: false }))

export const DELETE = Router().use(asyncMiddleware(async (req, res) => {
  await req.knossos.store.delete(req.hydra.resource.term)

  res.event({
    types: [as.Delete],
    summary: `Deleted resource ${req.hydra.resource.term}`,
    object: req.hydra.resource.term,
  })

  return res.sendStatus(httpStatus.NO_CONTENT)
}))

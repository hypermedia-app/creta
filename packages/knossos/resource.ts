import asyncMiddleware from 'middleware-async'
import clownface from 'clownface'
import TermSet from '@rdfjs/term-set'
import { Debugger } from 'debug'
import { created, updated } from '@hydrofoil/express-events/activity'
import { as, acl, hydra, rdf } from '@tpluscode/rdf-ns-builders'
import { StreamClient } from 'sparql-http-client/StreamClient'
import error from 'http-errors'
import httpStatus from 'http-status'
import { Router } from 'express'
import { check } from 'rdf-web-access-control'
import httpError from 'http-errors'
import { shaclValidate } from './lib/middleware/shacl'
import { knossos } from './lib/namespace'
import { save } from './lib/resource'

function canBeCreatedWithPut(api: clownface.AnyPointer, resource: clownface.GraphPointer, log: Debugger) {
  log('canBeCreatedWithPut')
  const types = resource.out(rdf.type)
  const classes = api.has(hydra.supportedClass, types).out(hydra.supportedClass)

  const classesAllowingPut = new TermSet(classes.has(knossos.createWithPUT, true).terms)
  const classesForbiddingPut = new TermSet(classes.has(knossos.createWithPUT, false).terms)

  if (classesAllowingPut.size === 0) {
    log('None of classes %O permit creating resources with PUT', [...new TermSet(classes.terms)])
    return false
  }

  if (classesForbiddingPut.size > 0) {
    log('Classes %O forbid creating resources with PUT', [...classesForbiddingPut])
    return false
  }

  return true
}

const saveResource = ({ create }: { create: boolean }) => asyncMiddleware(async (req, res) => {
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

  return res.resource(await req.knossos.store.load(resource.term))
})

const ensureNotExists = asyncMiddleware(async (req, res, next) => {
  const api = clownface(req.hydra.api)
  const resource = await req.resource()
  const exists = await req.knossos.store.exists(resource.term)

  if (exists) {
    req.knossos.log('exists')
    return next(new error.Conflict())
  }

  if (!canBeCreatedWithPut(api, resource, req.knossos.log)) {
    req.knossos.log('cannot')
    return next(new error.MethodNotAllowed())
  }

  req.knossos.log('Ok')
  next()
})

const checkPermissions = (client: StreamClient) => asyncMiddleware(async (req, res, next) => {
  req.knossos.log('Checking type restrictions')

  const types = (await req.resource()).out(rdf.type).terms
  const error = await check({
    types,
    accessMode: acl.Control,
    client,
    agent: req.agent,
  })

  if (!error) {
    return next(new httpError.Forbidden())
  }

  req.knossos.log('Resource types unrestricted')
  next()
})

export const create = (client: StreamClient) => Router().use(ensureNotExists, checkPermissions(client), shaclValidate, saveResource({ create: true }))

export const PUT = Router().use(shaclValidate, saveResource({ create: false }))

export const DELETE = Router().use(asyncMiddleware(async (req, res) => {
  await req.knossos.store.delete(req.hydra.resource.term)

  res.event({
    types: [as.Delete],
    summary: `Deleted resource ${req.hydra.resource.term}`,
    object: req.hydra.resource.term,
  })

  return res.sendStatus(httpStatus.NO_CONTENT)
}))

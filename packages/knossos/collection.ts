import { NamedNode } from 'rdf-js'
import { Request, Router, Response } from 'express'
import asyncMiddleware from 'middleware-async'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import { created } from '@hydrofoil/knossos-events/activity'
import error from 'http-errors'
import httpStatus from 'http-status'
import $rdf from 'rdf-ext'
import { fromPointer } from '@rdfine/hydra/lib/IriTemplate'
import { IriTemplateBundle } from '@rdfine/hydra/bundles'
import RdfResource, { ResourceIdentifier } from '@tpluscode/rdfine'
import clownface, { AnyPointer, GraphPointer, MultiPointer } from 'clownface'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import { describeResource } from '@hydrofoil/labyrinth/lib/query/describeResource'
import * as rdfRequest from 'express-rdf-request'
import { payloadTypes, shaclValidate } from './shacl'
import { save } from './lib/resource'
import { applyTransformations, hasAllRequiredVariables } from './lib/template'

export type { TransformVariable } from './lib/template'

RdfResource.factory.addMixin(...IriTemplateBundle)

function checkMemberTemplate(ptr: AnyPointer): ptr is GraphPointer<ResourceIdentifier> {
  return ptr.term?.termType === 'NamedNode' || ptr.term?.termType === 'BlankNode'
}

function rename(member: GraphPointer, id: NamedNode): GraphPointer<NamedNode> {
  for (const match of member.dataset.match(member.term)) {
    member.dataset.delete(match)
    member.dataset.add($rdf.quad(id, match.predicate, match.object, match.graph))
  }
  for (const match of member.dataset.match(null, null, member.term)) {
    member.dataset.delete(match)
    member.dataset.add($rdf.quad(match.subject, match.predicate, id, match.graph))
  }

  return member.node(id)
}

async function typesToValidate(req: Request) {
  const collection = await req.hydra.resource.clownface()
  const memberAssertions = collection.out([hydra.manages, hydra.memberAssertion])
  const types = memberAssertions.has(hydra.property, rdf.type).out(hydra.object)

  return [
    ...payloadTypes(req),
    ...types.terms,
  ]
}

type CreateMemberResponse = Response<any, {
  collection?: GraphPointer
  memberAssertions?: MultiPointer
}>

const assertMemberAssertions = asyncMiddleware(async (req, res: CreateMemberResponse, next) => {
  const member = await req.resource()
  res.locals.collection = await req.hydra.resource.clownface()
  const memberAssertions = res.locals.collection.out([hydra.manages, hydra.memberAssertion])

  for (const assertion of memberAssertions.toArray()) {
    const predicate = assertion.out(hydra.property).term
    const object = assertion.out(hydra.object).term
    if (predicate && object) {
      member.addOut(predicate, object)
    }
  }

  res.locals.memberAssertions = memberAssertions

  next()
})

const createResource = asyncMiddleware(async (req, res: CreateMemberResponse, next) => {
  const api = clownface(req.hydra.api)
  const types = res.locals.memberAssertions!.has(hydra.property, rdf.type).out(hydra.object)

  if (!types.terms.length) {
    return next(new error.InternalServerError('Collection does not have a member assertion with `hydra:property rdf:type`'))
  }

  const { type } = rdf
  const memberTemplate = api.node(res.locals.collection!.out(type)).out(knossos.memberTemplate)
  if (!checkMemberTemplate(memberTemplate)) {
    req.knossos.log.extend('collection')('Found member templates %o', memberTemplate.map(mt => mt.out(hydra.template).value))
    return next(new error.InternalServerError(`No unique knossos:memberTemplate found for collection ${res.locals.collection!.value}`))
  }

  const resource = await req.resource()
  const iriTemplate = fromPointer(memberTemplate)
  if (!hasAllRequiredVariables(iriTemplate, resource)) {
    return next(new error.BadRequest('Not all URI Template variables were provided.'))
  }

  const templateVariables = await applyTransformations(req, resource, iriTemplate.pointer)
  const memberId = $rdf.namedNode(new URL(iriTemplate.expand(templateVariables), req.absoluteUrl()).toString())

  if (await req.knossos.store.exists(memberId)) {
    return next(new error.Conflict())
  }

  req.knossos.log(`Creating resource ${memberId.value}`)
  const member = rename(resource, memberId)

  await save({ resource: member, req })

  res.event(created(member, {
    context: req.hydra.resource.term,
  }))

  await res.event.handleImmediate()

  res.status(httpStatus.CREATED)
  res.setHeader('Location', memberId.value)
  return res.quadStream(await describeResource(member.term, req.labyrinth.sparql))
})

export const CreateMember = Router()
  .use(rdfRequest.resource())
  .use(assertMemberAssertions)
  .use(shaclValidate({ typesToValidate }))
  .use(createResource)

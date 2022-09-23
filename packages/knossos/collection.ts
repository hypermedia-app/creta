import { NamedNode, Term } from 'rdf-js'
import express, { Request, Router, Response } from 'express'
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
import { preprocessMiddleware, sendResponse } from '@hydrofoil/labyrinth/lib/middleware'
import { getPayload } from '@hydrofoil/labyrinth/lib/request'
import TermSet from '@rdfjs/term-set'
import { payloadTypes, shaclValidate } from './shacl'
import { save } from './lib/resource'
import { applyTransformations, hasAllRequiredVariables } from './lib/template'
import { combinePointers } from './lib/clownface'
import '@hydrofoil/labyrinth'

export type { TransformVariable } from './lib/template'

type CreateMemberResponse = Response<any, {
  collection?: GraphPointer
  memberAssertions?: MultiPointer
  member?: GraphPointer<NamedNode>
}>

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

async function typesToValidate(req: Request, res: CreateMemberResponse) {
  const collectionAssertedTypes = res.locals.memberAssertions!
    .has(hydra.property, rdf.type)
    .out(hydra.object)

  return [
    ...payloadTypes(req),
    ...collectionAssertedTypes.terms,
  ]
}

const assertMemberAssertions = asyncMiddleware(async (req, res: CreateMemberResponse, next) => {
  const member = res.locals.member!

  for (const assertion of res.locals.memberAssertions!.toArray()) {
    const predicate = assertion.out(hydra.property).term
    const object = assertion.out(hydra.object).term
    if (predicate && object) {
      member.addOut(predicate, object)
    }
  }

  next()
})

const loadCollection = asyncMiddleware(async (req, res, next) => {
  res.locals.collection = await req.hydra.resource.clownface()
  next()
})

const prepareMemberPointer = asyncMiddleware(async (req, res: CreateMemberResponse, next) => {
  const api = clownface(req.hydra.api)
  const collection = res.locals.collection!
  let memberTemplate = collection.out(knossos.memberTemplate)
  if (!memberTemplate.term) {
    memberTemplate = api.node(collection.out(rdf.type)).out(knossos.memberTemplate)
  }

  if (!checkMemberTemplate(memberTemplate)) {
    req.knossos.log.extend('collection')('Found member templates %o', memberTemplate.map(mt => mt.out(hydra.template).value))
    return next(new error.InternalServerError(`No unique knossos:memberTemplate found for collection ${collection.value} or its types`))
  }

  const resource = await req.resource()
  const iriTemplate = fromPointer(memberTemplate)
  if (!hasAllRequiredVariables(iriTemplate, resource)) {
    return next(new error.BadRequest('Not all URI Template variables were provided.'))
  }

  const templateVariables = await applyTransformations(req, resource, iriTemplate.pointer)
  const url = new URL(iriTemplate.expand(templateVariables), req.absoluteUrl())
  url.pathname = `${req.baseUrl}${url.pathname}`

  const member = rename(resource, $rdf.namedNode(url.toString()))
  res.locals.member = member
  // replace getter to have downstream middlewares
  // use the rewritten member representation
  req.resource = async () => member

  next()
})

const memberAssertionPredicates = [hydra.manages, hydra.memberAssertion]
const assertTypeMemberAssertion: express.RequestHandler = asyncMiddleware(async (req, res: CreateMemberResponse, next) => {
  const collection = res.locals.collection!
  const collectionTypes = clownface(req.hydra.api).node(collection.out(rdf.type))

  const memberAssertions = combinePointers(collection, collectionTypes).out(memberAssertionPredicates)
  const types = memberAssertions.has(hydra.property, rdf.type).out(hydra.object)

  if (!types.terms.length) {
    return next(new error.InternalServerError('Collection does not have a member assertion with `hydra:property rdf:type`'))
  }

  res.locals.memberAssertions = memberAssertions
  next()
})

const createResource = asyncMiddleware(async (req, res: CreateMemberResponse, next) => {
  const member = res.locals.member!

  if (await req.knossos.store.exists(member.term)) {
    return next(new error.Conflict())
  }

  req.knossos.log(`Creating resource ${member.value}`)

  await save({ resource: member, req })

  res.event(created(member, {
    context: req.hydra.resource.term,
  }))

  await res.event.handleImmediate()

  res.status(httpStatus.CREATED)
  res.setHeader('Location', member.value)
  return next()
})

const dereferenceNewMember = asyncMiddleware(async (req, res: CreateMemberResponse, next) => {
  const term = res.locals.member!.term
  const describeStream = await describeResource(term, req.labyrinth.sparql)

  res.locals.member = clownface({
    dataset: await $rdf.dataset().import(describeStream),
    term,
  })
  next()
})

export const CreateMember = Router()
  .use(rdfRequest.resource())
  .use(loadCollection)
  .use(prepareMemberPointer)
  .use(assertTypeMemberAssertion)
  .use(preprocessMiddleware({
    predicate: knossos.preprocessPayload,
    getResource: getPayload,
    async getTypes(req, res: CreateMemberResponse) {
      const member = res.locals.member!

      const typeTerms: Term[] = res.locals.memberAssertions!
        .has(hydra.property, rdf.type)
        .out(hydra.object).terms
      const implicitTypes = new TermSet(typeTerms.filter((value): value is NamedNode => value.termType === 'NamedNode'))
      const explicitTypes = member.out(rdf.type).terms

      for (const explicitType of explicitTypes) {
        implicitTypes.delete(explicitType as any)
      }

      return implicitTypes
    },
  }))
  .use(assertMemberAssertions)
  .use(shaclValidate({ typesToValidate }))
  .use(createResource)
  .use(dereferenceNewMember)
  .use(preprocessMiddleware({
    getResource: async (_, res) => res.locals.member,
    getTypes: async (_, res) => res.locals.member.out(rdf.type).terms,
    predicate: knossos.preprocessResponse,
  }))
  .use((req, res: CreateMemberResponse, next) => {
    sendResponse(res.locals.member!.dataset)(req, res, next)
  })

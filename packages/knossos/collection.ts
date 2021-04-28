import { NamedNode } from 'rdf-js'
import { Router } from 'express'
import asyncMiddleware from 'middleware-async'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import { created } from '@hydrofoil/knossos-events/activity'
import error from 'http-errors'
import httpStatus from 'http-status'
import $rdf from 'rdf-ext'
import { fromPointer } from '@rdfine/hydra/lib/IriTemplate'
import { IriTemplateBundle } from '@rdfine/hydra/bundles'
import RdfResource, { ResourceIdentifier } from '@tpluscode/rdfine'
import clownface, { AnyPointer, GraphPointer } from 'clownface'
import { shaclValidate } from './shacl'
import { knossos } from './lib/namespace'
import { save } from './lib/resource'

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

export const POSTCreate = Router().use(shaclValidate).use(asyncMiddleware(async (req, res, next) => {
  const api = clownface(req.hydra.api)
  const collection = await req.hydra.resource.clownface()
  const types = collection.out([hydra.manages, hydra.memberAssertion]).has(hydra.property, rdf.type).out(hydra.object)

  if (!types.terms.length) {
    return next(new error.InternalServerError('Collection does not have a member assertion with `hydra:property rdf:type`'))
  }

  const { type } = rdf
  const { memberTemplate } = knossos
  const memberTemplateS = api.node(collection.out(type)).out(memberTemplate)
  if (!checkMemberTemplate(memberTemplateS)) {
    req.knossos.log.extend('collection')('Found member templates %o', memberTemplateS.map(mt => mt.out(hydra.template).value))
    return next(new error.InternalServerError(`No unique knossos:memberTemplate found for collection ${collection.value}`))
  }

  let member = await req.resource()
  const memberId = $rdf.namedNode(new URL(fromPointer(memberTemplateS).expand(member), req.absoluteUrl()).toString())

  if (await req.knossos.store.exists(memberId)) {
    return next(new error.Conflict())
  }

  req.knossos.log(`Creating resource ${memberId.value}`)
  member = rename(member, memberId).addOut(rdf.type, types)

  await save({ resource: member, req })

  res.event(created(member, {
    context: req.hydra.resource.term,
  }))

  await res.event.handleImmediate()

  res.status(httpStatus.CREATED)
  res.setHeader('Location', memberId.value)
  return res.resource(await req.knossos.store.load(member.term))
}))

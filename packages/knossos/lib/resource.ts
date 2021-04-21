import { NamedNode } from 'rdf-js'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import clownface, { AnyPointer, GraphPointer } from 'clownface'
import express from 'express'
import { Debugger } from 'debug'
import TermSet from '@rdfjs/term-set'
import { Knossos } from '../server'
import { knossos } from './namespace'

interface BeforeSaveParams {
  after: GraphPointer
  before: GraphPointer
  api: AnyPointer
  knossos: Knossos
  agent: GraphPointer | undefined
}

export interface BeforeSave {
  (arg: BeforeSaveParams): void
}

interface Save {
  req: express.Request
  resource: GraphPointer<NamedNode>
}

export async function save({ resource, req }: Save): Promise<void> {
  const api = clownface(req.hydra.api)

  const before = await req.knossos.store.load(resource.term)
  const guards = await Promise.all(api
    .node(resource.out(rdf.type))
    .out(knossos.beforeSave)
    .map(pointer => req.loadCode<BeforeSave>(pointer)))

  for (const guard of guards) {
    if (guard) {
      req.knossos.log('Running before save hook %s', guard.name)
      guard({
        api,
        after: resource,
        before,
        knossos: req.knossos,
        agent: req.agent,
      })
    }
  }

  await req.knossos.store.save(resource)
}

export function canBeCreatedWithPut(api: clownface.AnyPointer, resource: clownface.GraphPointer, log: Debugger) {
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

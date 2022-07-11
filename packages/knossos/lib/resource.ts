/**
 * @packageDocumentation
 * @module @hydrofoil/knossos/lib/resource
 */

import { NamedNode } from 'rdf-js'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import clownface, { AnyPointer, GraphPointer } from 'clownface'
import express from 'express'
import { Debugger } from 'debug'
import TermSet from '@rdfjs/term-set'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import { loadImplementations } from '@hydrofoil/labyrinth/lib/code'
import { Knossos } from '..'

export interface BeforeSaveParams {
  /**
   * Graph pointer to the hook in resource
   */
  node: GraphPointer
  /**
   * Graph pointer to the saved resource
   */
  after: GraphPointer
  /**
   * Graph pointer to the current resource. If that resource did not exist,
   * it will be an empty dataset
   */
  before: GraphPointer
  /**
   * Graph pointer to the `hydra:ApiDocumentation`
   */
  api: AnyPointer
  /**
   * The current knossos instance
   */
  knossos: Knossos
  /**
   * Graph pointer to the authenticated agent
   */
  agent: GraphPointer | undefined
}

/**
 * A "before hook" function, called when resources are created and updated, such
 * as when handling PUT requests, or POST to a collection
 */
export interface BeforeSave<Args extends unknown[] = []> {
  (beforeSave: BeforeSaveParams, ...args: Args): void | Promise<void>
}

export interface Save {
  req: express.Request
  /**
   * The resource to save
   */
  resource: GraphPointer<NamedNode>
}

export async function save({ resource, req }: Save): Promise<void> {
  const api = clownface(req.hydra.api)

  const before = await req.knossos.store.load(resource.term)
  const hookPointers = api.node(resource.out(rdf.type)).out(knossos.beforeSave)
  const beforeSaveHooks = await loadImplementations<BeforeSave<unknown[]>>(hookPointers, req)

  const promises = beforeSaveHooks.reduce((promises, [hook, args, node]) => {
    req.knossos.log('Running before save hook %s', hook.name)
    return [
      ...promises,
      hook({
        api,
        node,
        after: resource,
        before,
        knossos: req.knossos,
        agent: req.agent,
      }, ...args),
    ]
  }, [] as ReturnType<BeforeSave>[])

  await Promise.all(promises)

  await req.knossos.store.save(resource)
}

export function canBeCreatedWithPut(api: clownface.AnyPointer, resource: clownface.GraphPointer, log: Debugger): boolean {
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

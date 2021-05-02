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
import { Knossos } from '../server'
import { knossos } from './namespace'

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
 * as when handling PUT requests or POST to a collection
 */
export interface BeforeSave {
  (arg: BeforeSaveParams): void | Promise<void>
}

interface Save {
  req: express.Request
  resource: GraphPointer<NamedNode>
}

export async function save({ resource, req }: Save): Promise<void> {
  const api = clownface(req.hydra.api)

  const before = await req.knossos.store.load(resource.term)
  const beforeSaveHooks = await Promise.all(api
    .node(resource.out(rdf.type))
    .out(knossos.beforeSave)
    .map<Promise<[GraphPointer, BeforeSave | null]>>(async pointer => [pointer, await req.loadCode<BeforeSave>(pointer)]))

  const promises = beforeSaveHooks.reduce((promises, [node, hook]) => {
    if (!hook) {
      req.knossos.log('Failed to load before save hook %s', node.value)
      return promises
    }

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
      }),
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

import { NamedNode } from 'rdf-js'
import clownface, { GraphPointer, MultiPointer } from 'clownface'
import { Activity } from '@rdfine/as'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { as, rdf, rdfs } from '@tpluscode/rdf-ns-builders'
import { sparql } from '@tpluscode/rdf-string'
import { code } from '@hydrofoil/namespaces'
import type * as express from 'express'
import $rdf from 'rdf-ext'
import { Handler, ns } from '../index'

export function isNamedNode(pointer: GraphPointer): pointer is GraphPointer<NamedNode> {
  return pointer.term.termType === 'NamedNode'
}

function hasOneImplementation(pointer: MultiPointer): pointer is GraphPointer {
  return !!pointer.term
}

function handlerQuery(event: Activity) {
  const activityTypes = [...event.types].map(({ id }) => id)

  return DESCRIBE`?handler`.WHERE`
  VALUES ?activity { ${as.Activity} ${activityTypes} }
      
  ${event.object ? sparql`${event.object.id} a ?type .` : sparql`VALUES ?type { ${rdfs.Resource} }`}

  ?handler a ${ns.EventHandler} ;
           ${ns.eventSpec} [
              ${rdf.predicate} ${rdf.type} ;
              ${rdf.object} ?activity ;
           ] ;
           ${ns.objectSpec} [
              ${rdf.predicate} ${rdf.type} ;
              ${rdf.object} ?type ;
           ] ;
           ${code.implementedBy} ?impl .`
}

export async function loadHandlers(req: express.Request, event: Activity) {
  const client = req.labyrinth.sparql
  const dataset = await $rdf.dataset().import(await handlerQuery(event).execute(client.query))

  return Promise.all(clownface({ dataset })
    .has(code.implementedBy)
    .toArray()
    .reduce((promises, handler) => {
      const implementedBy = handler.out(code.implementedBy)
      if (hasOneImplementation(implementedBy)) {
        const impl = req.loadCode<Handler>(implementedBy)
        if (!impl) {
          return promises
        }
        const promise = Promise.resolve().then(() => impl).then(impl => ({ handler, impl }))
        return [
          ...promises,
          promise,
        ]
      }

      req.knossos.log('No unique handler implementation found for handler %s', handler.value)
      return promises
    }, [] as Array<Promise<{ handler: GraphPointer; impl: Handler }>>))
}

export async function runHandler(handler: GraphPointer, impl: Handler, event: Activity, req: express.Request) {
  if (!impl) {
    req.knossos.log('Failed to load implementation of handler %s', handler.value)
    return
  }

  req.knossos.log('Running handler %s for event %s', impl.name, event.id.value)
  return impl({ event, req })
}

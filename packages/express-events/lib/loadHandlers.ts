import { NamedNode } from 'rdf-js'
import clownface, { GraphPointer, MultiPointer } from 'clownface'
import { Activity } from '@rdfine/as'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { as, rdf, rdfs, hydra } from '@tpluscode/rdf-ns-builders/strict'
import { sparql } from '@tpluscode/rdf-string'
import { hyper_events, code } from '@hydrofoil/vocabularies/builders/strict'
import type * as express from 'express'
import $rdf from 'rdf-ext'
import { Handler } from '../index'
import { RuntimeHandler } from './index'

function hasOneImplementation(pointer: MultiPointer): pointer is GraphPointer {
  return !!pointer.term
}

function handlerQuery(event: Activity, api: NamedNode) {
  const activityTypes = [...event.types].map(({ id }) => id)

  return DESCRIBE`?handler`.WHERE`
  VALUES ?activity { ${as.Activity} ${activityTypes} }
      
  ${event.object ? sparql`${event.object.id} a ?type .` : sparql`VALUES ?type { ${rdfs.Resource} }`}

  ?handler a ${hyper_events.EventHandler} ;
           ${hyper_events.eventSpec} [
              ${rdf.predicate} ${rdf.type} ;
              ${rdf.object} ?activity ;
           ] ;
           ${hyper_events.objectSpec} [
              ${rdf.predicate} ${rdf.type} ;
              ${rdf.object} ?type ;
           ] ;
           ${code.implementedBy} ?impl ;
           ${hydra.apiDocumentation} ${api}`
}

export async function loadHandlers(req: express.Request, event: Activity) {
  const client = req.labyrinth.sparql
  const dataset = await $rdf.dataset().import(await handlerQuery(event, req.hydra.api.term!).execute(client.query))

  return Promise.all(clownface({ dataset })
    .has(code.implementedBy)
    .toArray()
    .reduce((promises, pointer) => {
      const implementedBy = pointer.out(code.implementedBy)
      if (hasOneImplementation(implementedBy)) {
        const impl = req.loadCode<Handler>(implementedBy)
        if (!impl) {
          return promises
        }
        const promise = Promise.resolve().then(() => impl).then(impl => ({ pointer, impl }))
        return [
          ...promises,
          promise,
        ]
      }

      req.knossos.log('Multiple implementations found for handler %s', pointer.value)
      return promises
    }, [] as Array<Promise<RuntimeHandler>>))
}

import { Activity } from '@rdfine/as'
import type { Initializer } from '@tpluscode/rdfine/RdfResource'
import express from 'express'
import { fromPointer } from '@rdfine/as/lib/Activity'
import clownface, { GraphPointer } from 'clownface'
import $rdf from 'rdf-ext'
import { nanoid } from 'nanoid'
import { NamedNode } from 'rdf-js'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { StreamClient } from 'sparql-http-client/StreamClient'
import { events } from './namespace'
import { code } from '@hydrofoil/labyrinth/lib/namespace'
import { rdf, rdfs } from '@tpluscode/rdf-ns-builders'
import { sparql } from '@tpluscode/rdf-string'
import namespace from '@rdfjs/namespace'

const as = namespace('https://www.w3.org/ns/activitystreams#')

interface HandlerParams {
  event: Activity
  req: express.Request
}

export interface Handler {
  (arg: HandlerParams): Promise<Activity[]> | Activity[] | void
}

declare module 'express-serve-static-core' {
  interface Response {
    event(ev: Initializer<Activity>): void
  }
}

const consume = (req: express.Request, events: Activity[]) => {
  return () => {
    req.knossos.log('Handling events')
    for (const event of events) {
      event.published = new Date()

      runHandlers(event, req.labyrinth.sparql, req).catch(req.knossos.log.extend('event'))

      if (isNamedNode(event.pointer)) {
        req.knossos.store.save(event.pointer).catch(req.knossos.log.extend('event'))
      }
    }
  }
}

export const attach: express.RequestHandler = (req, res, next) => {
  const events: Activity[] = []

  res.event = function emit(init) {
    const pointer = clownface({ dataset: $rdf.dataset() })
      .namedNode(`${req.hydra.api.term?.value}/activity/${nanoid()}`)

    const activity = fromPointer(pointer, {
      ...init,
      actor: req.user?.pointer,
    })
    events.push(activity)
  }

  res.once('finish', consume(req, events))

  next()
}

function isNamedNode(pointer: GraphPointer): pointer is GraphPointer<NamedNode> {
  return pointer.term.termType === 'NamedNode'
}

async function runHandlers(event: Activity, client: StreamClient, req: express.Request): Promise<void> {
  const activityTypes = [...event.types].map(({ id }) => id)

  const dataset = await $rdf.dataset().import(await DESCRIBE`?impl`
    .WHERE`
      VALUES ?activity { ${as.Activity} ${activityTypes} }
      
      ${event.object ? sparql`${event.object.id} a ?type .` : sparql`VALUES ?type { ${rdfs.Resource} }`}
    
      ?handler a ${events.EventHandler} ;
               ${events.eventSpec} [
                  ${rdf.predicate} ${rdf.type} ;
                  ${rdf.object} ?activity ;
               ] ;
               ${events.objectSpec} [
                  ${rdf.predicate} ${rdf.type} ;
                  ${rdf.object} ?type ;
               ] ;
               ${code.implementedBy} ?impl .
    `
    .execute(client.query))

  const handlers = await Promise.all(clownface({ dataset })
    .has(code.link)
    .map(pointer => req.hydra.api.loaderRegistry.load<Handler>(pointer, { basePath: req.hydra.api.codePath })))

  for (const handler of handlers) {
    if (handler) {
      handler({ event, req })
    }
  }
}

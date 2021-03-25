import { Activity } from '@rdfine/as'
import type { Initializer } from '@tpluscode/rdfine/RdfResource'
import type express from 'express'
import { fromPointer } from '@rdfine/as/lib/Activity'
import clownface, { GraphPointer, MultiPointer } from 'clownface'
import $rdf from 'rdf-ext'
import { nanoid } from 'nanoid'
import { NamedNode } from 'rdf-js'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { code } from '@hydrofoil/namespaces'
import { rdf, rdfs } from '@tpluscode/rdf-ns-builders'
import { sparql } from '@tpluscode/rdf-string'
import namespace from '@rdfjs/namespace'

export const as = namespace('https://www.w3.org/ns/activitystreams#')
export const ns = namespace('https://hypermedia.app/events#')

interface HandlerParams {
  event: Activity
  req: express.Request
}

export interface Handler {
  (arg: HandlerParams): Promise<Activity[]> | Activity[] | void | Promise<void>
}

interface Events {
  (...ev: Array<Initializer<Activity>>): void
  handleImmediate(): Promise<void>
}

declare module 'express-serve-static-core' {
  interface Response {
    event: Events
  }
}

function isNamedNode(pointer: GraphPointer): pointer is GraphPointer<NamedNode> {
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

async function loadHandlers(req: express.Request, event: Activity) {
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

async function runHandler(handler: GraphPointer, impl: Handler, event: Activity, req: express.Request) {
  if (!impl) {
    req.knossos.log('Failed to load implementation of handler %s', handler.value)
    return
  }

  req.knossos.log('Running handler %s for event %s', impl.name, event.id.value)
  return impl({ event, req })
}

interface PendingEvent {
  activity: Activity
  handlers: Promise<Array<{ handler: GraphPointer; impl: Handler }>>
}

export const attach: express.RequestHandler = (req, res, next) => {
  const pendingEvents: PendingEvent[] = []
  let immediateHandled = false

  const emit: Events = function emit(...events) {
    for (const init of events) {
      const pointer = clownface({ dataset: $rdf.dataset() })
        .namedNode(`${req.hydra.api.term?.value}/activity/${nanoid()}`)

      const activity = fromPointer(pointer, {
        ...init,
        actor: req.user?.pointer,
      })
      pendingEvents.push({
        activity,
        handlers: loadHandlers(req, activity),
      })
    }
  }

  emit.handleImmediate = (): Promise<any> => {
    const immediate = pendingEvents.map((item) => {
      return item.handlers
        .then(handlers => {
          const immediatePromises = handlers.map(({ handler, impl }) => {
            if (!handler.has(ns.immediate, true).terms.length) {
              req.knossos.log('Not immediate handler %s', handler.value)
              return
            }
            return runHandler(handler, impl, item.activity, req)
          })

          return Promise.all(immediatePromises)
        })
    })

    immediateHandled = true
    return Promise.all(immediate)
  }

  res.event = emit

  res.once('finish', function runRemainingHandlers() {
    for (const { activity, handlers } of pendingEvents) {
      handlers.then((arr) => {
        for (const { handler, impl } of arr) {
          if (handler.has(ns.immediate, true).terms.length && immediateHandled) {
            continue
          }

          runHandler(handler, impl, activity, req).catch(req.knossos.log.extend('event'))
        }
      }).catch(req.knossos.log.extend('event'))
    }
  })
  res.once('finish', async function saveActivities() {
    for (const { activity } of pendingEvents) {
      if (!isNamedNode(activity.pointer)) {
        continue
      }

      activity.published = new Date()
      req.knossos.store.save(activity.pointer).catch(req.knossos.log.extend('event'))
    }
  })

  next()
}

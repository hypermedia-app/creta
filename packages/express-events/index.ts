import { Activity } from '@rdfine/as'
import type express from 'express'
import { fromPointer } from '@rdfine/as/lib/Activity'
import clownface, { GraphPointer } from 'clownface'
import $rdf from 'rdf-ext'
import { nanoid } from 'nanoid'
import namespace from '@rdfjs/namespace'
import { attach } from 'rdf-express-node-factory'
import { loadHandlers, isNamedNode, runHandler } from './lib'

export const ns = namespace('https://hypermedia.app/events#')

interface HandlerParams {
  event: Activity
  req: express.Request
}

export interface Handler {
  (arg: HandlerParams): Promise<Activity[]> | Activity[] | void | Promise<void>
}

export interface Events {
  (...ev: Array<import('@tpluscode/rdfine/RdfResource').Initializer<Activity>>): void
  handleImmediate(): Promise<void>
}

declare module 'express-serve-static-core' {
  interface Response {
    event: Events
  }
}

interface PendingEvent {
  activity: Activity
  handlers: Promise<Array<{ handler: GraphPointer; impl: Handler }>>
  handled: boolean
}

interface KnossosEvents {
  path?: string
}

export const knossosEvents = ({ path = '_activity' }: KnossosEvents = {}): express.RequestHandler => (req, res, next) => {
  const pendingEvents: PendingEvent[] = []
  let immediateHandled = false

  attach(req)

  const emit: Events = function emit(...events) {
    for (const init of events) {
      const pointer = clownface({ dataset: $rdf.dataset() })
        .namedNode(req.rdf.namedNode(`/${path}/${nanoid()}`))

      const activity = fromPointer(pointer, {
        ...init,
        actor: req.agent,
      })
      pendingEvents.push({
        activity,
        handlers: loadHandlers(req, activity),
        handled: false,
      })
    }
  }

  emit.handleImmediate = (): Promise<any> => {
    if (immediateHandled) {
      return Promise.resolve()
    }

    const immediate = pendingEvents.map((item) => {
      return item.handlers
        .then(handlers => {
          const immediatePromises = handlers.map(({ handler, impl }) => {
            if (!handler.has(ns.immediate, true).terms.length) {
              req.knossos.log('Not immediate handler %s', handler.value)
              return
            }

            item.handled = true
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
    for (const { activity, handlers, handled } of pendingEvents) {
      handlers.then((arr) => {
        for (const { handler, impl } of arr) {
          if (handled) {
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

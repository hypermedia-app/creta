import { Activity } from '@rdfine/as'
import type express from 'express'
import { fromPointer } from '@rdfine/as/lib/Activity'
import clownface, { GraphPointer } from 'clownface'
import $rdf from 'rdf-ext'
import { nanoid } from 'nanoid'
import { hyper_events } from '@hydrofoil/vocabularies/builders/strict'
import { attach } from 'rdf-express-node-factory'
import { isNamedNode } from './lib'
import { loadHandlers } from './lib/loadHandlers'
import { runHandler } from './lib/runHandler'

export { hyper_events as ns } from '@hydrofoil/vocabularies/builders/strict'

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
  handlers: Promise<Array<{ handler: GraphPointer; impl: Handler; handled?: boolean }>>
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
          const immediatePromises = handlers.map(async (entry) => {
            if (!entry.handler.has(hyper_events.immediate, true).terms.length) {
              req.knossos.log('Not immediate handler %s', entry.handler.value)
              return
            }

            await runHandler(entry, item.activity, req)
            entry.handled = true
          })

          return Promise.all(immediatePromises)
        })
    })

    immediateHandled = true
    return Promise.all(immediate)
  }

  res.event = emit

  res.once('finish', function runRemainingHandlers() {
    if (pendingEvents.length === 0) return

    req.knossos.log('Running remaining event handlers')
    for (const { activity, handlers } of pendingEvents) {
      handlers.then((arr) => {
        for (const entry of arr) {
          runHandler(entry, activity, req).catch(req.knossos.log.extend('event'))
        }
      }).catch(req.knossos.log.extend('event'))
    }
  })
  res.once('finish', async function saveActivities() {
    if (pendingEvents.length === 0) return

    req.knossos.log('Saving events')
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

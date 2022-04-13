import { Activity } from '@rdfine/as'
import type express from 'express'
import { fromPointer } from '@rdfine/as/lib/Activity'
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import { nanoid } from 'nanoid'
import { attach } from 'rdf-express-node-factory'
import { loadHandlers } from './lib/loadHandlers'
import { runHandler } from './lib/runHandler'
import { ActivityQueue } from './lib/ActivityQueue'

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

interface KnossosEvents {
  path?: string
}

export const knossosEvents = ({ path = '_activity' }: KnossosEvents = {}): express.RequestHandler => (req, res, next) => {
  const logger = req.knossos.log.extend('event')

  function store(activity: Activity) {
    const pointer = clownface({ dataset: $rdf.dataset() })
      .namedNode(req.rdf.namedNode(`/${path}/${nanoid()}`))
    fromPointer(pointer, {
      ...activity,
      published: new Date(),
    })

    return req.knossos.store.save(pointer).catch(req.knossos.log.extend('event'))
  }

  const queue = new ActivityQueue({
    logger,
    loader: loadHandlers.bind(null, req),
    runner: runHandler.bind(null, req),
    store,
  })

  attach(req)

  const emit: Events = function emit(...events) {
    for (const init of events) {
      const activity = {
        ...init,
        actor: req.agent,
      }

      queue.addActivity(activity)
    }
  }

  emit.handleImmediate = (): Promise<void> => {
    return queue.runImmediateHandlers()
  }

  res.event = emit

  res.once('finish', async function runRemainingHandlers() {
    req.knossos.log('Running remaining event handlers')
    await queue.runRemainingHandlers()
  })
  res.once('finish', async function saveActivities() {
    req.knossos.log('Saving events')
    await queue.saveEvents()
  })

  next()
}

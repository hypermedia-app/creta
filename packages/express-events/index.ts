import { NamedNode } from 'rdf-js'
import { Activity } from '@rdfine/as'
import type express from 'express'
import { GraphPointer } from 'clownface'
import { nanoid } from 'nanoid'
import { attach } from 'rdf-express-node-factory'
import type { Initializer } from '@tpluscode/rdfine/RdfResource'
import { loadHandlers } from './lib/loadHandlers'
import { runHandler } from './lib/runHandler'
import { ActivityQueue } from './lib/ActivityQueue'

export { hyper_events as ns } from '@hydrofoil/vocabularies/builders/strict'

interface HandlerParams {
  event: Activity
  req: express.Request
}

type MaybeAsync<T> = T | Promise<T>
type ArrayOrSingle<T> = T | T[]

export interface Handler {
  (arg: HandlerParams): MaybeAsync<ArrayOrSingle<Initializer<Activity>> | void>
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

  function store(pointer: GraphPointer<NamedNode>) {
    return req.knossos.store.save(pointer).catch(req.knossos.log.extend('event'))
  }

  const queue = new ActivityQueue({
    logger,
    loader: loadHandlers.bind(null, req),
    runner: runHandler.bind(null, req),
    store,
    activityId: () => req.rdf.namedNode(`/${path}/${nanoid()}`),
  })

  attach(req)

  const emit: Events = function emit(...events) {
    for (const init of events) {
      const activity = {
        ...init,
        actor: req.agent,
        published: new Date(),
      }

      queue.addActivity(activity)
    }
  }

  emit.handleImmediate = (): Promise<void> => {
    req.knossos.log('Running immediate event handlers')
    return queue.runImmediateHandlers()
  }

  res.event = emit

  res.once('finish', async function runRemainingHandlers() {
    req.knossos.log('Running remaining event handlers')
    await queue.runRemainingHandlers()
    await queue.saveEvents()
  })

  next()
}

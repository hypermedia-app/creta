import Queue from 'queue'
import { Activity } from '@rdfine/as'
import clownface, { GraphPointer } from 'clownface'
import { hyper_events } from '@hydrofoil/vocabularies/builders/strict'
import type { Debugger } from 'debug'
import type { Initializer } from '@tpluscode/rdfine/RdfResource'
import { fromPointer } from '@rdfine/as/lib/Activity'
import $rdf from 'rdf-ext'
import { Handler } from '../'
import { RuntimeHandler } from './'

export interface Loader {
  (event: Activity): Promise<RuntimeHandler[]>
}

export interface Runner {
  (handler: RuntimeHandler, activity: Activity): Promise<ReturnType<Handler>>
}

export interface StoreEvent {
  (event: Activity): Promise<void>
}

interface Options {
  loader: Loader
  runner: Runner
  store: StoreEvent
  logger: Debugger
}

export class ActivityQueue {
  private readonly activities: Queue
  private readonly immediateQueue: Queue
  private readonly asyncQueue: Queue
  private readonly storeQueue: Queue
  private readonly loader: Loader
  private readonly runner: Runner
  private readonly logger: Debugger
  private readonly store: StoreEvent
  private immediateHandled = false

  constructor({ loader, logger, runner, store }: Options) {
    this.logger = logger
    this.loader = loader
    this.store = store
    this.activities = new Queue({ autostart: true })
    this.immediateQueue = new Queue()
      .on('end', () => logger('Finished immediate handlers'))
    this.asyncQueue = new Queue()
      .on('end', () => logger('Finished async handlers'))
    this.storeQueue = new Queue()
      .on('end', () => logger('Saved activities'))
      .on('error', err => logger(err))
    this.runner = runner
  }

  addActivity(activityInit: Initializer<Activity>) {
    const pointer = clownface({ dataset: $rdf.dataset() }).blankNode()
    const activity = fromPointer(pointer, activityInit)

    this.activities.push(async () => {
      const handlers = await this.loader(activity)
      for (const handler of handlers) {
        if (isImmediate(handler.pointer) && !this.immediateHandled) {
          this.immediateQueue.push(this.createJob(handler, activity))
        } else {
          this.asyncQueue.push(this.createJob(handler, activity))
        }
      }
    })
    this.storeQueue.push(this.store.bind(null, activity))
  }

  async runImmediateHandlers(): Promise<void> {
    await this.handlersLoaded()

    if (this.immediateHandled) {
      return
    }

    if (!this.immediateQueue.length) {
      this.immediateHandled = true
      return
    }
    this.immediateQueue.start()

    return new Promise(resolve => {
      this.immediateQueue.on('end', () => {
        this.immediateHandled = true
        resolve()
      })
    })
  }

  async runRemainingHandlers(): Promise<void> {
    await this.handlersLoaded()
    if (!this.asyncQueue.length) {
      return
    }

    this.asyncQueue.start()
    await new Promise(resolve => {
      this.asyncQueue.on('end', resolve)
    })
  }

  async saveEvents(): Promise<void> {
    if (!this.storeQueue.length) {
      return
    }

    this.storeQueue.start()
    await new Promise(resolve => {
      this.storeQueue.on('end', resolve)
    })
  }

  private async handlersLoaded(): Promise<void> {
    if (this.activities.length) {
      await new Promise(resolve => {
        this.activities.on('end', resolve)
      })
    }
  }

  private createJob(handler: RuntimeHandler, activity: Activity) {
    return async () => {
      const moreEvents = await this.runner(handler, activity)
      this.logger(`Finished handler ${handler.pointer.value}`)
      moreEvents?.forEach(this.addActivity.bind(this))
    }
  }
}

function isImmediate(handler: GraphPointer) {
  return handler.has(hyper_events.immediate, true).terms.length
}

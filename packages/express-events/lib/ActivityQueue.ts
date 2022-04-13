import { NamedNode } from 'rdf-js'
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
  (event: GraphPointer<NamedNode>): Promise<void>
}

interface Options {
  loader: Loader
  runner: Runner
  store: StoreEvent
  logger: Debugger
  activityId(): NamedNode
}

export class ActivityQueue {
  private readonly activities: Queue
  private readonly immediateQueue: Queue
  private readonly asyncQueue: Queue
  private readonly storeQueue: Queue
  private readonly options: Options
  private immediateHandled = false

  constructor(options: Options) {
    this.options = options
    this.activities = new Queue({ autostart: true })
    this.immediateQueue = new Queue()
      .on('end', () => options.logger('Finished immediate handlers'))
    this.asyncQueue = new Queue()
      .on('end', () => options.logger('Finished async handlers'))
    this.storeQueue = new Queue()
      .on('end', () => options.logger('Saved activities'))
      .on('error', err => options.logger(err))
  }

  addActivity(activityInit: Initializer<Activity>) {
    const pointer = clownface({ dataset: $rdf.dataset() })
      .namedNode(this.options.activityId())
    const activity = fromPointer(pointer, activityInit)

    this.activities.push(async () => {
      const handlers = await this.options.loader(activity)
      for (const handler of handlers) {
        if (isImmediate(handler.pointer) && !this.immediateHandled) {
          this.immediateQueue.push(this.createJob(handler, activity))
        } else {
          this.asyncQueue.push(this.createJob(handler, activity))
        }
      }
    })
    this.storeQueue.push(this.options.store.bind(null, pointer))
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
      const moreEvents = await this.options.runner(handler, activity)
      this.options.logger(`Finished handler ${handler.pointer.value}`)
      if (Array.isArray(moreEvents)) {
        moreEvents.forEach(this.addActivity.bind(this))
      } else if (moreEvents) {
        this.addActivity(moreEvents)
      }
    }
  }
}

function isImmediate(handler: GraphPointer) {
  return handler.has(hyper_events.immediate, true).terms.length
}

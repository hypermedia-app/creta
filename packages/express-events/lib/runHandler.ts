import { GraphPointer } from 'clownface'
import { Activity } from '@rdfine/as'
import type * as express from 'express'
import { Handler } from '../index'

export interface RuntimeHandler {
  handler: GraphPointer
  impl: Handler | undefined
  handled?: boolean
}

export async function runHandler({ impl, handler, handled }: RuntimeHandler, event: Activity, req: express.Request) {
  if (handled) {
    return
  }

  if (!impl) {
    req.knossos.log('Failed to load implementation of handler %s', handler.value)
    return
  }

  req.knossos.log('Running handler %s for event %s', impl.name, event.id.value)
  return impl({ event, req })
}

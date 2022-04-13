import { Activity } from '@rdfine/as'
import type * as express from 'express'
import { RuntimeHandler } from './'

export async function runHandler(req: express.Request, { impl, pointer, handled }: RuntimeHandler, event: Activity) {
  if (handled) {
    return
  }

  if (!impl) {
    req.knossos.log('Failed to load implementation of handler %s', pointer.value)
    return
  }

  req.knossos.log('Running handler %s for event %s', impl.name, event.id.value)
  return impl({ event, req })
}

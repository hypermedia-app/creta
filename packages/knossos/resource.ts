import { protectedResource } from '@hydrofoil/labyrinth/resource'
import asyncMiddleware from 'middleware-async'
import { ResourceStore } from './lib/store'
import { shaclValidate } from './lib/shacl'

declare module 'express-serve-static-core' {
  interface Request {
    knossos: {
      store: ResourceStore
    }
  }
}

export const put = protectedResource(shaclValidate, asyncMiddleware(async (req, res) => {
  await req.knossos.store.save(await req.resource())

  const updated = await req.knossos.store.load(req.hydra.resource.term)
  return res.resource(updated)
}))

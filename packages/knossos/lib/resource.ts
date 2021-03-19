import { rdf } from '@tpluscode/rdf-ns-builders'
import clownface, { AnyPointer, GraphPointer } from 'clownface'
import { User } from '@hydrofoil/labyrinth'
import express from 'express'
import { NamedNode } from 'rdf-js'
import { Knossos } from '../server'
import { knossos } from './namespace'

interface BeforeSaveParams {
  after: GraphPointer
  before: GraphPointer
  api: AnyPointer
  knossos: Knossos
  user: User | undefined
}

export interface BeforeSave {
  (arg: BeforeSaveParams): void
}

interface Save {
  req: express.Request
  resource: GraphPointer<NamedNode>
}

export async function save({ resource, req }: Save): Promise<void> {
  const api = clownface(req.hydra.api)

  const before = await req.knossos.store.load(resource.term)
  const guards = await Promise.all(api
    .node(resource.out(rdf.type))
    .out(knossos.beforeSave)
    .map(pointer => req.hydra.api.loaderRegistry.load<BeforeSave>(pointer, { basePath: req.hydra.api.codePath })))

  for (const guard of guards) {
    if (guard) {
      req.knossos.log('Running before save hook %s', guard.name)
      guard({
        api,
        after: resource,
        before,
        knossos: req.knossos,
        user: req.user,
      })
    }
  }

  await req.knossos.store.save(resource)
}

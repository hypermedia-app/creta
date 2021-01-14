import asyncMiddleware from 'middleware-async'
import clownface, { AnyPointer } from 'clownface'
import { hydra } from '@tpluscode/rdf-ns-builders'
import { protectedResource } from './resource'
import * as lib from './lib/collection'

export const get = protectedResource(asyncMiddleware(async (req, res) => {
  const types = clownface(req.hydra.api).node([...req.hydra.resource.types])
  let request: AnyPointer | undefined
  if (req.dataset) {
    request = clownface({ dataset: await req.dataset() })
  }

  const collection = await req.hydra.resource.clownface()
  const hydraLimit = collection.out(hydra.limit).value || types.out(hydra.limit).value
  const pageSize = hydraLimit ? parseInt(hydraLimit) : req.app.labyrinth.collection.pageSize

  const { dataset } = await lib.collection({
    hydraBox: req.hydra,
    collection,
    query: request,
    sparqlClient: req.app.sparql,
    pageSize,
  })

  res.setLink(req.hydra.resource.term.value, 'canonical')
  return res.dataset(dataset)
}))

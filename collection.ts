import asyncMiddleware from 'middleware-async'
import clownface, { AnyPointer } from 'clownface'
import { hydra } from '@tpluscode/rdf-ns-builders'
import { protectedResource } from './resource'
import { collection } from './lib/collection'

export const get = protectedResource(asyncMiddleware(async (req, res) => {
  const types = clownface(req.hydra.api).namedNode([...req.hydra.resource.types])
  let request: AnyPointer | undefined
  if (req.dataset) {
    request = clownface({ dataset: await req.dataset() })
  }

  const hydraLimit = clownface(req.hydra.resource).out(hydra.limit).value || types.out(hydra.limit).value
  const pageSize = hydraLimit ? parseInt(hydraLimit) : req.app.labyrinth.collection.pageSize

  const { dataset } = await collection({
    hydraBox: req.hydra,
    collection: clownface(req.hydra.resource),
    query: request,
    sparqlClient: req.app.sparql,
    pageSize,
  })

  res.setLink(req.hydra.resource.term.value, 'canonical')
  return res.dataset(dataset)
}))

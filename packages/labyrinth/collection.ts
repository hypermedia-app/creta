import asyncMiddleware from 'middleware-async'
import clownface, { AnyPointer, GraphPointer } from 'clownface'
import { hydra } from '@tpluscode/rdf-ns-builders'
import * as lib from './lib/collection'
import * as template from './lib/template'
import { log } from './lib/logger'

function isGraphPointer(pointer: AnyPointer): pointer is GraphPointer {
  return !!pointer.term
}

export const get = asyncMiddleware(async (req, res) => {
  const types = clownface(req.hydra.api).node([...req.hydra.resource.types])

  const collection = await req.hydra.resource.clownface()
  let query: AnyPointer | undefined
  const search = collection.out(hydra.search)
  if (isGraphPointer(search)) {
    query = template.toPointer(search, req.query)

    log('Search params %s', query.dataset.toString())
  }

  const hydraLimit = collection.out(hydra.limit).value || types.out(hydra.limit).value
  const pageSize = hydraLimit ? parseInt(hydraLimit) : req.labyrinth.collection.pageSize

  const { dataset } = await lib.collection({
    hydraBox: req.hydra,
    collection,
    query,
    sparqlClient: req.labyrinth.sparql,
    pageSize,
  })

  res.setLink(req.hydra.resource.term.value, 'canonical')
  return res.dataset(dataset)
})

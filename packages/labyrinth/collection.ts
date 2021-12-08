import asyncMiddleware from 'middleware-async'
import clownface, { AnyPointer } from 'clownface'
import { hydra } from '@tpluscode/rdf-ns-builders'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import { preprocessResource } from './lib/middleware/preprocessResource'
import * as lib from './lib/collection'
import * as template from './lib/template'
import { log } from './lib/logger'

export const get = asyncMiddleware(async (req, res) => {
  const types = clownface(req.hydra.api).node([...req.hydra.resource.types])

  const collection = await req.hydra.resource.clownface()
  let query: AnyPointer | undefined
  const search = await lib.loadSearch(collection, req.labyrinth.sparql)
  if (search) {
    query = template.toPointer(search, req.query)

    log('Search params %s', query.dataset.toString())
  }

  const hydraLimit = query?.out(hydra.limit).value || collection.out(hydra.limit).value || types.out(hydra.limit).value
  const pageSize = hydraLimit ? parseInt(hydraLimit) : req.labyrinth.collection.pageSize

  const { dataset } = await lib.collection({
    hydraBox: req.hydra,
    collection,
    query,
    sparqlClient: req.labyrinth.sparql,
    pageSize,
  })

  await preprocessResource({
    req,
    res,
    async getResource() {
      return clownface({ dataset, term: req.hydra.resource.term })
    },
    predicate: knossos.preprocessResponse,
  })

  res.setLink(req.hydra.resource.term.value, 'canonical')
  return res.dataset(dataset)
})

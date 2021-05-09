/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth/resource
 */

import asyncMiddleware from 'middleware-async'
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import TermSet from '@rdfjs/term-set'
import { query } from '@hydrofoil/namespaces'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { loadLinkedResources } from './lib/query/eagerLinks'

/**
 * Generic middleware for handling `GET` requests
 */
export const get = asyncMiddleware(async (req, res) => {
  const types = clownface({
    dataset: req.hydra.api.dataset,
    term: [...req.hydra.resource.types],
  })

  if (req.labyrinth.preferReturnMinimal) {
    return res.quadStream(req.hydra.resource.quadStream())
  }

  let dataset = await $rdf.dataset().import(await DESCRIBE`${req.hydra.resource.term}`.execute(req.labyrinth.sparql.query))
  if (!req.agent) {
    const restrictedProperties = new TermSet([...types.out(query.restrict).terms])
    dataset = dataset.filter(quad => !restrictedProperties.has(quad.predicate))
  }

  const pointer = clownface({ dataset, term: req.hydra.resource.term })
  return res.dataset(dataset.merge(await loadLinkedResources(pointer, types.out(query.include).toArray(), req.labyrinth.sparql)))
})

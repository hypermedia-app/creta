/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth/resource
 */

import asyncMiddleware from 'middleware-async'
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import TermSet from '@rdfjs/term-set'
import { hyper_query } from '@hydrofoil/vocabularies/builders'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import parsePreferHeader from 'parse-prefer-header'
import express from 'express'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import { preprocessResource } from './lib/middleware/preprocessResource'
import { loadLinkedResources } from './lib/query/eagerLinks'

export type { ResourceHook } from './lib/middleware/preprocessResource'

export function preferMinimal(req: express.Request): boolean {
  const prefer = parsePreferHeader(req.header('Prefer'))
  return prefer.return === 'minimal'
}

/**
 * Generic middleware for handling `GET` requests
 */
export const get = asyncMiddleware(async (req, res) => {
  const types = clownface({
    dataset: req.hydra.api.dataset,
    term: [...req.hydra.resource.types],
  })

  if (preferMinimal(req)) {
    res.setHeader('Preference-Applied', 'return=minimal')
    return res.quadStream(
      await DESCRIBE`${req.hydra.resource.term}`
        .FROM(req.hydra.resource.term)
        .execute(req.labyrinth.sparql.query))
  }

  // TODO combine describe of resource and linked resources
  let dataset = await $rdf.dataset().import(await DESCRIBE`${req.hydra.resource.term}`.execute(req.labyrinth.sparql.query))
  if (!req.agent) {
    const restrictedProperties = new TermSet([...types.out(hyper_query.restrict).terms])
    dataset = dataset.filter(quad => !restrictedProperties.has(quad.predicate))
  }

  const pointer = clownface({ dataset, term: req.hydra.resource.term })
  dataset.addAll(await loadLinkedResources(pointer, types.out(hyper_query.include), req.labyrinth.sparql))

  await preprocessResource({
    req,
    res,
    getResource: async () => pointer,
    predicate: knossos.preprocessResponse,
  })

  return res.dataset(dataset)
})

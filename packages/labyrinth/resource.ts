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
import { loadLinkedResources } from './lib/query/eagerLinks'

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
    return res.quadStream(req.hydra.resource.quadStream())
  }

  let dataset = await $rdf.dataset().import(await DESCRIBE`${req.hydra.resource.term}`.execute(req.labyrinth.sparql.query))
  if (!req.agent) {
    const restrictedProperties = new TermSet([...types.out(hyper_query.restrict).terms])
    dataset = dataset.filter(quad => !restrictedProperties.has(quad.predicate))
  }

  const pointer = clownface({ dataset, term: req.hydra.resource.term })
  return res.dataset(dataset.merge(await loadLinkedResources(pointer, types.out(hyper_query.include).toArray(), req.labyrinth.sparql)))
})

/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth/lib/middleware/returnMinimal
 */

import { NamedNode, Stream } from 'rdf-js'
import express from 'express'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import asyncMiddleware from 'middleware-async'
import { prefersMinimal } from '../request'

/**
 * Function to load a minimal representation of the given term.
 *
 * Default implementation does a `DESCRIBE` from the resource's graph. An alternative could be a
 * `CONSTRUCT { ?s ?p ?o }` from said graph.
 */
export interface MinimalRepresentationFactory {
  (arg: { req: express.Request; term: NamedNode }): Promise<Stream>
}

export const returnMinimal: express.RequestHandler = asyncMiddleware(async (req, res, next) => {
  if (!prefersMinimal(req)) {
    return next()
  }

  res.setHeader('Preference-Applied', 'return=minimal')

  const minimalRepresentation = req.labyrinth.minimalRepresentation || defaultMinimalRepresentation
  return res.quadStream(await minimalRepresentation({ req, term: req.hydra.resource.term }))
})

function defaultMinimalRepresentation(...[{ req, term }]: Parameters<MinimalRepresentationFactory>) {
  return DESCRIBE`${term}`.FROM(term).execute(req.labyrinth.sparql.query)
}

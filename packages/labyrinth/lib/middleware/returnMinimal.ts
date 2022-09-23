/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth/lib/middleware/returnMinimal
 */

import { NamedNode, Stream } from 'rdf-js'
import express from 'express'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import asyncMiddleware from 'middleware-async'
import $rdf from 'rdf-ext'
import { prefersMinimal } from '../request'
import { sendResponse } from './sendResponse'

/**
 * Function to load a minimal representation of the given term.
 *
 * Default implementation does a `DESCRIBE` from the resource's graph. An alternative could be a
 * `CONSTRUCT { ?s ?p ?o }` from said graph.
 */
export interface MinimalRepresentationLoader {
  (arg: { req: express.Request; term: NamedNode }): Promise<Stream>
}

export const returnMinimal: express.RequestHandler = asyncMiddleware(async (req, res, next) => {
  if (!prefersMinimal(req)) {
    return next()
  }

  res.setHeader('Preference-Applied', 'return=minimal')

  const minimalRepresentation = req.labyrinth.minimalRepresentation || defaultMinimalRepresentation
  const dataset = await $rdf.dataset().import(await minimalRepresentation({ req, term: req.hydra.resource.term }))

  sendResponse(dataset)(req, res, next)
})

function defaultMinimalRepresentation(...[{ req, term }]: Parameters<MinimalRepresentationLoader>) {
  return DESCRIBE`${term}`.FROM(term).execute(req.labyrinth.sparql.query)
}

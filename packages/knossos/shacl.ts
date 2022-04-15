/**
 * @packageDocumentation
 * @module @hydrofoil/knossos/shacl
 */

import { Term } from 'rdf-js'
import TermSet from '@rdfjs/term-set'
import { rdf, rdfs, sh } from '@tpluscode/rdf-ns-builders'
import { shaclMiddleware } from 'express-middleware-shacl'
import $rdf from 'rdf-ext'
import clownface from 'clownface'
import { RequestHandler, Request } from 'express'
import { CONSTRUCT } from '@tpluscode/sparql-builder'
import { shapesQuery } from './lib/shacl'
import './types'

export interface Options {
  /**
   * Function to select identifiers of types which should be validated.
   * Defaults to the sum of existing resource types and payload types.
   */
  typesToValidate?: (req: Request) => Term[] | Promise<Term[]>
}

/**
 * Selects payload types and existing resource's types for validation
 */
export function payloadAndResourceTypes(req: Request): Term[] {
  return [
    ...(req.hydra.resource?.types || []),
    ...req.shacl.dataGraph.out(rdf.type).terms,
  ]
}

/**
 * Selects only payload types for validation
 */
export function payloadTypes(req: Request): Term[] {
  return req.shacl.dataGraph.out(rdf.type).terms
}

/**
 * Middleware which runs SHACL validation of request payload
 */
export const shaclValidate = ({ typesToValidate = payloadAndResourceTypes }: Options = {}): RequestHandler => shaclMiddleware({
  async loadShapes(req) {
    const types = new TermSet(await typesToValidate(req))

    const dataset = await $rdf.dataset().import(await shapesQuery({
      term: req.hydra.term,
      types: [...types],
      sparql: req.labyrinth.sparql,
      api: req.hydra.api.term!,
    }))

    const hasSubClass = clownface({ dataset }).has(rdfs.subClassOf)
    for (const shape of hasSubClass.toArray()) {
      const subShapes = shape.out(rdfs.subClassOf)
      shape.addList(sh.and, subShapes)
    }

    return dataset
  },
  async loadTypes(resources, req) {
    const types = await CONSTRUCT`?instance a ?type`
      .WHERE`
        VALUES ?instance {
          ${resources}
        }
        
        ?instance a ?type .
      `
      .execute(req.labyrinth.sparql.query)

    return $rdf.dataset().import(types)
  },
})

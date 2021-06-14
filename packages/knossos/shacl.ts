/**
 * @packageDocumentation
 * @module @hydrofoil/knossos/shacl
 */

import TermSet from '@rdfjs/term-set'
import { rdf, rdfs, sh } from '@tpluscode/rdf-ns-builders'
import { shaclMiddleware } from 'express-middleware-shacl'
import $rdf from 'rdf-ext'
import clownface from 'clownface'
import { RequestHandler } from 'express'
import { shapesQuery } from './lib/shacl'

export interface Options {
  /**
   * Set to true to only load shapes for the request payload,
   * ignoring the types of the existing resource, if any
   */
  payloadTypesOnly?: boolean
}

/**
 * Middleware which runs SHACL validation of request payload
 */
export const shaclValidate = ({ payloadTypesOnly }: Options = {}): RequestHandler => shaclMiddleware({
  async loadShapes(req) {
    let types: TermSet
    if (payloadTypesOnly) {
      types = new TermSet(req.shacl.dataGraph.out(rdf.type).terms)
    } else {
      types = new TermSet([
        ...(req.hydra.resource?.types || []),
        ...req.shacl.dataGraph.out(rdf.type).terms,
      ])
    }

    const dataset = await $rdf.dataset().import(await shapesQuery({
      term: req.hydra.term,
      types: [...types],
      sparql: req.labyrinth.sparql,
    }))

    const hasSubClass = clownface({ dataset }).has(rdfs.subClassOf)
    for (const shape of hasSubClass.toArray()) {
      const subShapes = shape.out(rdfs.subClassOf)
      shape.addList(sh.and, subShapes)
    }

    return dataset
  },
})

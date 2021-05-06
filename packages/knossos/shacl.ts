/**
 * @packageDocumentation
 * @module @hydrofoil/knossos/shacl
 */

import TermSet from '@rdfjs/term-set'
import { rdf, rdfs, sh } from '@tpluscode/rdf-ns-builders'
import { shaclMiddleware } from 'express-middleware-shacl'
import $rdf from 'rdf-ext'
import clownface from 'clownface'
import { shapesQuery } from './lib/shacl'

/**
 * Middleware which runs SHACL validation of request payload
 */
export const shaclValidate = shaclMiddleware({
  async loadShapes(req) {
    const types = new TermSet([
      ...(req.hydra.resource?.types || []),
      ...req.shacl.dataGraph.out(rdf.type).terms,
    ])

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

/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth/lib/query/filters
 */

import { sparql } from '@tpluscode/rdf-string'
import { warn } from '../logger'
import { ToSparqlPatterns } from '.'

export type Filter<T extends unknown[] = []> = ToSparqlPatterns<T>

export const exactMatch: Filter = ({ subject, predicate, object }) => {
  const [term, ...more] = object.terms
  if (more.length) {
    warn('Multiple values provided to exact match filter. Only first is used')
  }

  return sparql`${subject} ${predicate} ${term}`
}

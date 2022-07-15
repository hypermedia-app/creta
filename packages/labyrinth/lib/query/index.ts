/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth/lib/query
 */

import { Term, Variable } from 'rdf-js'
import { MultiPointer } from 'clownface'
import { SparqlTemplateResult } from '@tpluscode/rdf-string'

export interface Pattern {
  /**
   * The subject, which represents the filtered collection member
   */
  subject: Variable
  /**
   * The property, as mapped by the `hydra:mapping`
   */
  predicate: Term
  /**
   * Pointer to value or values extracted from the request query parameters
   */
  object: MultiPointer

  /**
   * Creates a unique RDF/JS variable, adding a prefix unique to each invocation of a filter
   * @param name
   */
  variable(name: string): Variable
}

export interface Filter<Args extends unknown[] = []> {
  (options: Pattern, ...args: Args): string | SparqlTemplateResult
}

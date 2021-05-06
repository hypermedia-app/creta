import { Term, Variable } from 'rdf-js'
import { MultiPointer } from 'clownface'
import { SparqlTemplateResult } from '@tpluscode/rdf-string'

export interface Pattern {
  subject: Variable
  predicate: Term
  object: MultiPointer
}

export interface ToSparqlPatterns {
  (options: Pattern): string | SparqlTemplateResult
}

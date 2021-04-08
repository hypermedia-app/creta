import { Term, Variable } from 'rdf-js'
import { GraphPointer } from 'clownface'

export interface Pattern {
  subject: Variable
  predicate: Term
  object: GraphPointer
}

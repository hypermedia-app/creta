import { GraphPointer } from 'clownface'
import { Term, Variable } from 'rdf-js'

export interface Pattern {
  subject: Variable
  predicate: Term
  object: GraphPointer
}

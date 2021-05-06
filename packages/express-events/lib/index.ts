import { NamedNode } from 'rdf-js'
import { GraphPointer } from 'clownface'

export function isNamedNode(pointer: GraphPointer): pointer is GraphPointer<NamedNode> {
  return pointer.term.termType === 'NamedNode'
}

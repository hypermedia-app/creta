import { AnyPointer, GraphPointer } from 'clownface'
import { ResourceIdentifier } from '@tpluscode/rdfine'

export function isGraphPointer(pointer: AnyPointer | undefined): pointer is GraphPointer<ResourceIdentifier> {
  return pointer?.term?.termType === 'NamedNode' || pointer?.term?.termType === 'BlankNode'
}

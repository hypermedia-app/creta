import type { Initializer } from '@tpluscode/rdfine/RdfResource'
import { Create, Delete, Update } from '@rdfine/as'
import { NamedNode } from 'rdf-js'
import { GraphPointer } from 'clownface'
import { as } from '@tpluscode/rdf-ns-builders'

export function created(object: NamedNode | GraphPointer<NamedNode>, init: Initializer<Create> = {}): Initializer<Create> {
  return {
    types: [as.Create],
    summary: `Created resource ${object.value}`,
    ...init,
    object,
  }
}

export function updated(object: NamedNode | GraphPointer<NamedNode>, init: Initializer<Update> = {}): Initializer<Update> {
  return {
    types: [as.Update],
    summary: `Updated resource ${object.value}`,
    ...init,
    object,
  }
}

export function deleted(object: NamedNode | GraphPointer<NamedNode>, init: Initializer<Delete> = {}): Initializer<Delete> {
  return {
    types: [as.Delete],
    summary: `Deleted resource ${object.value}`,
    ...init,
    object,
  }
}

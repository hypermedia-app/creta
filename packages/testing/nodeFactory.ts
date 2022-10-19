import { BlankNode, DatasetCore, NamedNode } from 'rdf-js'
import clownface, { AnyPointer, GraphPointer } from 'clownface'
import DatasetExt from 'rdf-ext/lib/Dataset'
import $rdf from 'rdf-ext'
import toStream from 'string-to-stream'
import { turtle } from '@tpluscode/rdf-string'
import { StreamParser } from 'n3'
import { fromStream } from 'rdf-dataset-ext'

export function namedNode<Iri extends string = string>(term: Iri | NamedNode<Iri>): GraphPointer<NamedNode, DatasetExt> {
  return clownface({ dataset: $rdf.dataset() }).namedNode(term)
}

export function blankNode(label?: string): GraphPointer<BlankNode, DatasetExt> {
  return clownface({ dataset: $rdf.dataset() }).blankNode(label)
}

export async function parse(...[strings, ...values]: Parameters<typeof turtle>): Promise<GraphPointer> {
  const dataset = await $rdf.dataset().import(getStream(strings, ...values))

  return clownface({ dataset }).namedNode('')
}

export function append(...[strings, ...values]: Parameters<typeof turtle>) {
  return {
    async to(other: DatasetCore | AnyPointer) {
      const dataset = 'dataset' in other ? other.dataset : other
      await fromStream(dataset, getStream(strings, ...values))
    },
  }
}

function getStream(...[strings, ...values]: Parameters<typeof turtle>) {
  const turtleStream = toStream(turtle(strings, ...values).toString())
  return turtleStream.pipe(new StreamParser())
}

import { BlankNode, NamedNode } from 'rdf-js'
import clownface, { GraphPointer } from 'clownface'
import DatasetExt from 'rdf-ext/lib/Dataset'
import $rdf from 'rdf-ext'
import toStream from 'string-to-stream'
import { turtle } from '@tpluscode/rdf-string'
import { StreamParser } from 'n3'

export function namedNode<Iri extends string = string>(term: Iri | NamedNode<Iri>): GraphPointer<NamedNode, DatasetExt> {
  return clownface({ dataset: $rdf.dataset() }).namedNode(term)
}

export function blankNode(label?: string): GraphPointer<BlankNode, DatasetExt> {
  return clownface({ dataset: $rdf.dataset() }).blankNode(label)
}

export async function parse(...[strings, ...values]: Parameters<typeof turtle>): Promise<GraphPointer> {
  const turtleStream = toStream(turtle(strings, ...values).toString())
  const quadStream = turtleStream.pipe(new StreamParser())
  const dataset = await $rdf.dataset().import(quadStream)

  return clownface({ dataset }).namedNode('')
}

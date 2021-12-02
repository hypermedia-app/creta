import { GraphPointer, MultiPointer } from 'clownface'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import DatasetExt from 'rdf-ext/lib/Dataset'
import $rdf from 'rdf-ext'
import type StreamClient from 'sparql-http-client/StreamClient'
import TermSet from '@rdfjs/term-set'
import { findNodes } from 'clownface-shacl-path'

export async function loadLinkedResources(resource: MultiPointer, links: GraphPointer[], sparql: StreamClient): Promise<DatasetExt> {
  const dataset = $rdf.dataset()

  const linked = new TermSet(links
    .flatMap(link => findNodes(resource, link).terms)
    .filter(term => term.termType === 'NamedNode'))

  if (linked.size) {
    const stream = await DESCRIBE`${linked}`.execute(sparql.query)
    await dataset.import(stream)
  }

  return dataset
}

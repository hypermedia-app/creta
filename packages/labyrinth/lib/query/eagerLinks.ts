import { MultiPointer } from 'clownface'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import DatasetExt from 'rdf-ext/lib/Dataset'
import $rdf from 'rdf-ext'
import type StreamClient from 'sparql-http-client/StreamClient'
import TermSet from '@rdfjs/term-set'
import { findNodes } from 'clownface-shacl-path'
import { hyper_query } from '@hydrofoil/vocabularies/builders/strict'
import { warn } from '../logger'

export async function loadLinkedResources(resource: MultiPointer, includes: MultiPointer, sparql: StreamClient): Promise<DatasetExt> {
  const dataset = $rdf.dataset()

  const parent = new TermSet(resource.terms)
  const paths = includes.toArray().flatMap(include => include.out(hyper_query.path).toArray())

  const linked = new TermSet(paths
    .flatMap(path => {
      try {
        return findNodes(resource, path).terms
      } catch {
        warn('Skipping include with invalid property path')
        return []
      }
    })
    .filter(term => term.termType === 'NamedNode' && !parent.has(term)))

  if (linked.size) {
    const stream = await DESCRIBE`${linked}`.execute(sparql.query)
    await dataset.import(stream)
  }

  return dataset
}

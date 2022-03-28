import { MultiPointer } from 'clownface'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import DatasetExt from 'rdf-ext/lib/Dataset'
import $rdf from 'rdf-ext'
import type StreamClient from 'sparql-http-client/StreamClient'
import TermSet from '@rdfjs/term-set'
import { findNodes } from 'clownface-shacl-path'
import { hyper_query } from '@hydrofoil/vocabularies/builders/strict'
import { warn } from '../logger'

export async function loadLinkedResources(resource: MultiPointer, links: MultiPointer, sparql: StreamClient): Promise<DatasetExt> {
  const dataset = $rdf.dataset()

  const parent = new TermSet(resource.terms)
  const linked = new TermSet(links.toArray()
    .flatMap(link => {
      const path = link.out(hyper_query.path)
      if (path.values.length !== 1) {
        warn('Skipping include with invalid property path')
        return []
      }

      return findNodes(resource, path).terms
    })
    .filter(term => term.termType === 'NamedNode' && !parent.has(term)))

  if (linked.size) {
    const stream = await DESCRIBE`${linked}`.execute(sparql.query)
    await dataset.import(stream)
  }

  return dataset
}

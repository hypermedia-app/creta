import { NamedNode } from 'rdf-js'
import { GraphPointer, MultiPointer } from 'clownface'
import { SparqlGraphQueryExecutable } from '@tpluscode/sparql-builder/lib'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import DatasetExt from 'rdf-ext/lib/Dataset'
import $rdf from 'rdf-ext'
import type StreamClient from 'sparql-http-client/StreamClient'
import TermSet from '@rdfjs/term-set'

function getLinkedResources(resource: MultiPointer, property: NamedNode): SparqlGraphQueryExecutable | null {
  const linked = resource.out(property)

  if (linked.values.length === 0) {
    return null
  }

  const linkedUris = [...linked.terms].filter(({ termType }) => termType === 'NamedNode')
  return DESCRIBE`${linkedUris}`
}

export async function loadLinkedResources(resource: MultiPointer, links: GraphPointer[], sparql: StreamClient): Promise<DatasetExt> {
  const dataset = $rdf.dataset()

  const uniqueLinks = new TermSet(links.map(link => link.term))

  await Promise.all(([...uniqueLinks].reduce((promises, term) => {
    if (term.termType === 'NamedNode') {
      promises.push((async () => {
        const query = getLinkedResources(resource, term)

        if (query) {
          const stream = await query.execute(sparql.query)
          await dataset.import(stream)
        }
      })())
    }
    return promises
  }, [] as Promise<void>[])))

  return dataset
}

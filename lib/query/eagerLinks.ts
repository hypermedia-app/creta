import { MultiPointer } from 'clownface'
import { NamedNode } from 'rdf-js'
import { SparqlGraphQueryExecutable } from '@tpluscode/sparql-builder/lib'
import { CONSTRUCT } from '@tpluscode/sparql-builder'
import DatasetExt from 'rdf-ext/lib/Dataset'
import $rdf from 'rdf-ext'
import type StreamClient from 'sparql-http-client/StreamClient'

function getLinkedResources(resource: MultiPointer, property: NamedNode): SparqlGraphQueryExecutable | null {
  const linked = resource.out(property)

  if (linked.values.length === 0) {
    return null
  }

  return [...linked.terms].reduce((current, graph) => {
    if (graph.termType === 'NamedNode') {
      return current.FROM(graph)
    }

    return current
  }, CONSTRUCT`?s ?p ?o`.WHERE`?s ?p ?o`)
}

export async function loadLinkedResources(resource: MultiPointer, links: MultiPointer, sparql: StreamClient): Promise<DatasetExt> {
  const dataset = $rdf.dataset()

  await Promise.all((links.toArray().reduce((promises, property) => {
    const { term } = property
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

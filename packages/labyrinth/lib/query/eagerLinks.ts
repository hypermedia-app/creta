import { Variable } from 'rdf-js'
import { GraphPointer, MultiPointer } from 'clownface'
import { DESCRIBE, sparql } from '@tpluscode/sparql-builder'
import DatasetExt from 'rdf-ext/lib/Dataset'
import $rdf from 'rdf-ext'
import type StreamClient from 'sparql-http-client/StreamClient'
import TermSet from '@rdfjs/term-set'
import { toSparql } from 'clownface-shacl-path'
import { hyper_query } from '@hydrofoil/vocabularies/builders/strict'
import { SparqlTemplateResult } from '@tpluscode/rdf-string'
import { VALUES } from '@tpluscode/sparql-builder/expressions'
import { warn } from '../logger'

export function reduceToValidPaths(arr: SparqlTemplateResult[], path: GraphPointer) {
  try {
    return [...arr, toSparql(path)]
  } catch {
    warn('Skipping include with invalid property path')
    return arr
  }
}

export const pathsToUnion = (subject: Variable, linked: Variable) => (previous: SparqlTemplateResult, path: SparqlTemplateResult, index: number): SparqlTemplateResult => {
  const graphPattern = sparql`{
        ${subject} ${path} ${linked} .
      }`

  if (index === 0) {
    return graphPattern
  }

  return sparql`${previous}\nUNION\n${graphPattern}`
}

export async function loadLinkedResources(resource: MultiPointer, includes: MultiPointer, client: StreamClient): Promise<DatasetExt> {
  const dataset = $rdf.dataset()
  const parentVar = $rdf.variable('parent')
  const linkedVar = $rdf.variable('linked')

  const parents = [...new TermSet(resource.terms)].map(parent => ({ parent }))
  const paths = includes.toArray()
    .flatMap(include => include.out(hyper_query.path).toArray())
    .reduce(reduceToValidPaths, [])

  if (paths.length && parents.length) {
    const patterns = paths
      .reduce(pathsToUnion(parentVar, linkedVar), sparql``)

    const stream = await DESCRIBE`${linkedVar}`
      .WHERE`
        ${VALUES(...parents)}
      
        ${patterns}
        
        FILTER ( isIRI(${linkedVar}) )
      `
      .execute(client.query)
    await dataset.import(stream)
  }

  return dataset
}

import { Variable, Stream, Term } from 'rdf-js'
import { GraphPointer } from 'clownface'
import { DESCRIBE, sparql } from '@tpluscode/sparql-builder'
import $rdf from 'rdf-ext'
import type StreamClient from 'sparql-http-client/StreamClient'
import TermSet from '@rdfjs/term-set'
import { toSparql } from 'clownface-shacl-path'
import { hyper_query } from '@hydrofoil/vocabularies/builders/strict'
import { SparqlTemplateResult } from '@tpluscode/rdf-string'
import { VALUES } from '@tpluscode/sparql-builder/expressions'
import { warn } from '../logger'

function reduceToValidPaths(arr: SparqlTemplateResult[], path: GraphPointer) {
  try {
    return [...arr, toSparql(path)]
  } catch {
    warn('Skipping include with invalid property path')
    return arr
  }
}

const pathsToUnion = (subject: Variable, linked: Variable) => (previous: SparqlTemplateResult, path: SparqlTemplateResult, index: number): SparqlTemplateResult => {
  const graphPattern = sparql`{
        ${subject} ${path} ${linked} .
      }`

  if (index === 0) {
    return graphPattern
  }

  return sparql`${previous}\nUNION\n${graphPattern}`
}

function createDescribeFunction(linksOnly: boolean) {
  return async function (terms: Term[], includes: GraphPointer[], client: StreamClient): Promise<Stream> {
    const resource = $rdf.variable('resource')
    const linkedVar = $rdf.variable('linked')

    const resources = [...new TermSet(terms)].map(resource => ({ resource }))
    if (resources.length) {
      const paths = includes
        .flatMap(include => include.out(hyper_query.path).toArray())
        .reduce(reduceToValidPaths, [])

      if (paths.length) {
        const patterns = paths
          .reduce(pathsToUnion(resource, linkedVar), sparql``)

        const toDescribe = linksOnly ? linkedVar : `${resource} ${linkedVar}`

        return DESCRIBE`${toDescribe}`
          .WHERE`
            ${VALUES(...resources)}
          
            ${patterns}
            
            FILTER ( isIRI(${linkedVar}) )
          `
          .execute(client.query)
      }

      if (!linksOnly) {
        return DESCRIBE`${resource}`.WHERE`${VALUES(...resources)}`.execute(client.query)
      }
    }

    return $rdf.dataset().toStream()
  }
}

export const loadLinkedResources = createDescribeFunction(true)
export const loadResourceWithLinks = createDescribeFunction(false)

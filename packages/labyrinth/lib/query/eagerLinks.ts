import { Variable, Stream, Term } from 'rdf-js'
import { GraphPointer } from 'clownface'
import { Construct, DESCRIBE, sparql } from '@tpluscode/sparql-builder'
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

function createDescribe(terms: Term[], includes: GraphPointer[], linksOnly: false): Promise<Construct>;
function createDescribe(terms: Term[], includes: GraphPointer[], linksOnly: true): Promise<Construct | null>;
async function createDescribe(terms: Term[], includes: GraphPointer[], linksOnly: boolean): Promise<Construct | null> {
  const resource = $rdf.variable('resource')
  const linkedVar = $rdf.variable('linked')

  const resources = [...new TermSet(terms)]
    .filter(term => term.termType === 'NamedNode')
    .map(resource => ({ resource }))
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
        
          OPTIONAL {
            ${patterns}
            
            FILTER ( isIRI(${linkedVar}) )
          }
        `
    }

    if (!linksOnly) {
      return DESCRIBE`${resource}`.WHERE`${VALUES(...resources)}`
    }
  }

  return null
}

export async function loadLinkedResources(terms: Term[], includes: GraphPointer[], client: StreamClient): Promise<Stream> {
  const query = await createDescribe(terms, includes, true)

  return query?.execute(client.query) || $rdf.dataset().toStream()
}

export async function loadResourceWithLinks(terms: Term[], includes: GraphPointer[]): Promise<Construct> {
  return createDescribe(terms, includes, false)
}

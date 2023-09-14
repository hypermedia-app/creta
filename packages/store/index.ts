/**
 * @packageDocumentation
 * @module @hydrofoil/resource-store
 */

import { DatasetCore, NamedNode, Term } from 'rdf-js'
import type { GraphPointer } from 'clownface'
import { StreamClient } from 'sparql-http-client/StreamClient'
import { ASK, CONSTRUCT, INSERT } from '@tpluscode/sparql-builder'
import $rdf from '@zazuko/env'
import { sparql } from '@tpluscode/rdf-string'

/**
 * Provides functions to work with individual resources.
 *
 * Implementors should take care to retrieve and manipulate only resource's "own" triples,
 * that is, avoid retrieving inferred statements or statements from other resources' representations.
 */
export interface ResourceStore {
  exists(term: Term): Promise<boolean>

  load(term: Term): Promise<GraphPointer<NamedNode, DatasetCore>>

  save(resource: GraphPointer<NamedNode>): Promise<void>

  delete(term: Term): Promise<void>
}

function assertNamedNode(term: Term): asserts term is NamedNode {
  if (term.termType !== 'NamedNode') {
    throw new Error('Term must be a named node')
  }
}

/**
 * Default implementation of {@see ResourceStore}, which keeps each resource
 * is its own named graph.
 */
export class ResourcePerGraphStore implements ResourceStore {
  constructor(private client: StreamClient) {
  }

  exists(term: Term): Promise<boolean> {
    assertNamedNode(term)

    return ASK`?s ?p ?o`.FROM(term).execute(this.client.query)
  }

  async load(term: Term): Promise<GraphPointer<NamedNode>> {
    assertNamedNode(term)

    const dataset = await $rdf.dataset().import(await CONSTRUCT`?s ?p ?o`
      .FROM(term)
      .WHERE`?s ?p ?o`
      .execute(this.client.query))

    return $rdf.clownface({ dataset, term })
  }

  async save(resource: GraphPointer<NamedNode>): Promise<void> {
    const insert = INSERT.DATA`GRAPH ${resource.term} { ${resource.dataset} }`
    const query = sparql`DROP SILENT GRAPH ${resource.term}; ${insert}`

    return this.client.query.update(query.toString())
  }

  async delete(term: Term): Promise<void> {
    const query = sparql`DROP SILENT GRAPH ${term}`
    return this.client.query.update(query.toString())
  }
}

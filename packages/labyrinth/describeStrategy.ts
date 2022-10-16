/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth/describeStrategy
 */

import { NamedNode, Stream } from 'rdf-js'
import { GraphPointer } from 'clownface'
import StreamClient from 'sparql-http-client'
import { rdf } from '@tpluscode/rdf-ns-builders'
import { loadResourceWithLinks } from './lib/query/eagerLinks'

/**
 * Returns an RDF/JS quad stream with the representation of the given term(s)
 */
export interface DescribeStrategy {
  (...terms: NamedNode[]): Promise<Stream> | Stream
}

export interface DescribeStrategyFactory<Args extends unknown[] = []> {
  (
    arg: {api: GraphPointer; resource: GraphPointer; client: StreamClient},
    ...args: Partial<Args>
  ): Promise<DescribeStrategy> | DescribeStrategy
}

/**
 * Default describe strategy which queries `DESCRIBE` from union graph
 */
export const unionGraphDescribe: DescribeStrategyFactory<[NamedNode]> = ({ api, resource, client }, includeProperty) =>
  (...members) => {
    const classIncludes = api.node(resource.out(rdf.type)).out(includeProperty).toArray()
    const instanceIncludes = resource.out(includeProperty).toArray()

    const includePaths = [...classIncludes, ...instanceIncludes]
    return loadResourceWithLinks(members, includePaths, client)
  }

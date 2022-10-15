import { NamedNode } from 'rdf-js'
import { Construct } from '@tpluscode/sparql-builder'
import { GraphPointer } from 'clownface'
import StreamClient from 'sparql-http-client'
import { rdf } from '@tpluscode/rdf-ns-builders'
import { loadResourceWithLinks } from './lib/query/eagerLinks'

export interface DescribeStrategy {
  (...members: NamedNode[]): Promise<Construct> | Construct
}

export interface DescribeStrategyFactory<Args extends unknown[] = []> {
  (
    arg: {api: GraphPointer; resource: GraphPointer; client: StreamClient},
    ...args: Partial<Args>
  ): Promise<DescribeStrategy> | DescribeStrategy
}

export const unionGraphDescribeStrategy: DescribeStrategyFactory<[NamedNode]> = ({ api, resource }, includeProperty) => {
  return (...members) => {
    const classIncludes = api.node(resource.out(rdf.type)).out(includeProperty).toArray()
    const instanceIncludes = resource.out(includeProperty).toArray()

    const includePaths = [...classIncludes, ...instanceIncludes]
    return loadResourceWithLinks(members, includePaths)
  }
}

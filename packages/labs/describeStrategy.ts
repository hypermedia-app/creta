import { DescribeStrategyFactory } from '@hydrofoil/labyrinth/describeStrategy'
import { CONSTRUCT } from '@tpluscode/sparql-builder'
import type { GraphPointer } from 'clownface'
import { shapeToPatterns } from '@hydrofoil/shape-to-query'
import { VALUES } from '@tpluscode/sparql-builder/expressions'
import { hyper_query } from '@hydrofoil/vocabularies/builders'
import { rdf } from '@tpluscode/rdf-ns-builders'
import { typeShape } from './lib/describeStrategy'
import { toUnion } from './lib/sparql'

interface Options {
  shapePath?: GraphPointer
}

export const constructByNodeShape: DescribeStrategyFactory<[Options]> =
  ({ api, resource, client }, { shapePath = hyper_query.constructShape } = {}) => {
    const shapes = api
      .node(resource.out(rdf.type))
      .out(shapePath)
      .toArray()

    if (!shapes.length) {
      throw new Error(`Did not find ${shapePath.value} on any of the resource's classes`)
    }

    const patterns = [typeShape, ...shapes].map((shape, index) => shapeToPatterns(shape, {
      subjectVariable: 'resource',
      objectVariablePrefix: `${index}`,
    }))

    return (...terms) => {
      const resources = terms.map(term => ({ resource: term }))

      return CONSTRUCT`${patterns}`
        .WHERE`
          ${VALUES(...resources)}
          ${patterns.reduce(toUnion)}
        `.execute(client.query)
    }
  }

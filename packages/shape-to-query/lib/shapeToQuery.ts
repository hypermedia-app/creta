import type { GraphPointer } from 'clownface'
import { CONSTRUCT } from '@tpluscode/sparql-builder'
import { shapeToPatterns, Options } from './shapeToPatterns'

export function construct(shape: GraphPointer, options: Omit<Options, 'strict'> = {}) {
  const patterns = shapeToPatterns(shape, options)

  return CONSTRUCT`
    ${patterns.constructClause()}
  `.WHERE`
    ${patterns.whereClause()}
  `
}

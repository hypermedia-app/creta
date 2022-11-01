import type { GraphPointer } from 'clownface'
import { CONSTRUCT } from '@tpluscode/sparql-builder'
import { shapeToPatterns, Options } from './shapeToPatterns'

export function construct(shape: GraphPointer, options: Options = {}) {
  return CONSTRUCT`
    ${shapeToPatterns(shape, { ...options, strict: true })}
  `.WHERE`
    ${shapeToPatterns(shape, { ...options, strict: false })}
  `
}

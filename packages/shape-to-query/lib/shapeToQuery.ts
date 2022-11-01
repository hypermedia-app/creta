import type { GraphPointer } from 'clownface'
import { CONSTRUCT } from '@tpluscode/sparql-builder'
import { shapeToPatterns, Options } from './shapeToPatterns'

export function construct(shape: GraphPointer, options: Omit<Options, 'strict'> = {}) {
  return CONSTRUCT`
    ${shapeToPatterns(shape, { ...options, strict: true, patternsOnly: true })}
  `.WHERE`
    ${shapeToPatterns(shape, { ...options, strict: false })}
  `
}

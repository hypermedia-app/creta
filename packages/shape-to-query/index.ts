import type { GraphPointer } from 'clownface'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import { sh } from '@tpluscode/rdf-ns-builders'

export function shapeToPatterns(shape: GraphPointer, variablePrefix: string): SparqlTemplateResult {
  const targetClass = shape.out(sh.targetClass).term
  return sparql`?${variablePrefix} a ${targetClass}`
}

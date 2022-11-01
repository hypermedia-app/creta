import type { GraphPointer } from 'clownface'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import { sh, xsd } from '@tpluscode/rdf-ns-builders'
import $rdf from '@rdfjs/data-model'
import { create, PrefixedVariable } from './lib/variableFactory'

interface Options {
  subjectVariable: string
  objectVariablePrefix?: string
}

const TRUE = $rdf.literal('true', xsd.boolean)

export function shapeToPatterns(shape: GraphPointer, { subjectVariable, objectVariablePrefix = '' }: Options): SparqlTemplateResult {
  const focusNode = create(subjectVariable)

  return sparql`${targetClass(shape, focusNode)}
  ${propertyShapes(shape, focusNode, objectVariablePrefix)}`
}

function targetClass(shape: GraphPointer, focusNode: PrefixedVariable) {
  const targetClass = shape.out(sh.targetClass).term
  if (!targetClass) {
    return ''
  }

  return sparql`${focusNode()} a ${targetClass} .`
}

function propertyShapes(shape: GraphPointer, focusNode: PrefixedVariable, objectVariablePrefix: string) {
  return shape.out(sh.property)
    .filter(propShape => !propShape.has(sh.deactivated, TRUE).term)
    .map((propShape, index) => {
      const variable = objectVariablePrefix
        ? focusNode.extend(objectVariablePrefix).extend(index)
        : focusNode.extend(index)

      return sparql`${focusNode()} ${propShape.out(sh.path).term} ${variable()} .`
    })
}

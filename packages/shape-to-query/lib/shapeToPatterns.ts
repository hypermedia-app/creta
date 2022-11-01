import { NamedNode } from 'rdf-js'
import type { GraphPointer } from 'clownface'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import { sh, xsd } from '@tpluscode/rdf-ns-builders'
import $rdf from '@rdfjs/data-model'
import { IN } from '@tpluscode/sparql-builder/expressions'
import { create, PrefixedVariable } from './variableFactory'

export interface Options {
  subjectVariable?: string
  focusNode?: NamedNode
  objectVariablePrefix?: string
  strict?: boolean
  patternsOnly?: true
}

type PropertyShapeOptions = Pick<Options, 'objectVariablePrefix' | 'strict'>

const TRUE = $rdf.literal('true', xsd.boolean)

export function shapeToPatterns(shape: GraphPointer, options: Options): SparqlTemplateResult {
  const focusNode = create({
    focusNode: options.focusNode,
    prefix: options.subjectVariable || 'resource',
  })

  return sparql`${targetClass(shape, focusNode, options.patternsOnly)}
  ${propertyShapes(shape, focusNode, options)}`
}

function targetClass(shape: GraphPointer, focusNode: PrefixedVariable, patternsOnly?: boolean) {
  const targetClass = shape.out(sh.targetClass).terms
  if (!targetClass.length) {
    return ''
  }

  if (targetClass.length === 1) {
    return sparql`${focusNode()} a ${targetClass} .`
  }

  const typeVar = focusNode.extend('targetClass')
  if (patternsOnly) {
    return sparql`${focusNode()} a ${typeVar()} .`
  }

  return sparql`
  ${focusNode()} a ${typeVar()} .
  FILTER ( ${typeVar()} ${IN(...targetClass)} )
  `
}

function propertyShapes(shape: GraphPointer, focusNode: PrefixedVariable, options: PropertyShapeOptions) {
  const propertyPatterns = shape.out(sh.property)
    .filter(propShape => !propShape.has(sh.deactivated, TRUE).term)
    .map((propShape, index) => {
      const variable = options.objectVariablePrefix
        ? focusNode.extend(options.objectVariablePrefix).extend(index)
        : focusNode.extend(index)

      return sparql`${focusNode()} ${propShape.out(sh.path).term} ${variable()} .`
    })

  if (propertyPatterns.length > 1 && options.strict === false) {
    return propertyPatterns.reduce((union, next, index) => {
      if (index === 0) {
        return sparql`{ ${next} }`
      }

      return sparql`${union}
      UNION
      { ${next} }`
    }, sparql``)
  }

  return propertyPatterns
}

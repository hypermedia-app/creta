import { NamedNode, Quad } from 'rdf-js'
import type { GraphPointer } from 'clownface'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import { rdf, sh, xsd } from '@tpluscode/rdf-ns-builders'
import $rdf from '@rdfjs/data-model'
import { IN } from '@tpluscode/sparql-builder/expressions'
import TermSet from '@rdfjs/term-set'
import { isNamedNode } from 'is-graph-pointer'
import { create, PrefixedVariable } from './variableFactory'

export interface Options {
  subjectVariable?: string
  focusNode?: NamedNode
  objectVariablePrefix?: string
}

type PropertyShapeOptions = Pick<Options, 'objectVariablePrefix'>

const TRUE = $rdf.literal('true', xsd.boolean)

interface ShapePatterns extends Iterable<SparqlTemplateResult> {
  whereClause(): SparqlTemplateResult
  constructClause(): SparqlTemplateResult
}

export function shapeToPatterns(shape: GraphPointer, options: Options): ShapePatterns {
  const focusNode = create({
    focusNode: options.focusNode,
    prefix: options.subjectVariable || 'resource',
  })

  const { targetClassPattern, targetClassFilter } = targetClass(shape, focusNode)
  const resourcePatterns = [...deepPropertyShapePatterns({
    shape,
    focusNode,
    options,
  })]

  const flatPatterns = () => [targetClassPattern, ...resourcePatterns
    .flat()
    .reduce((set, quad) => set.add(quad), new TermSet()),
  ].map(quad => sparql`${quad}`)

  return {
    [Symbol.iterator]() {
      return flatPatterns()[Symbol.iterator]()
    },
    constructClause() {
      return sparql`
        ${[...flatPatterns()]}
      `
    },
    whereClause() {
      return sparql`
        ${targetClassPattern}
        ${targetClassFilter}
        ${toUnion(resourcePatterns)}
      `
    },
  }
}

function targetClass(shape: GraphPointer, focusNode: PrefixedVariable) {
  const targetClass = shape.out(sh.targetClass)
  if (!targetClass.terms.length) {
    return {}
  }

  if (isNamedNode(targetClass)) {
    return {
      targetClassPattern: $rdf.quad(focusNode(), rdf.type, targetClass.term),
    }
  }

  const typeVar = focusNode.extend('targetClass')

  return {
    targetClassPattern: $rdf.quad(focusNode(), rdf.type, typeVar()),
    targetClassFilter: sparql`FILTER ( ${typeVar()} ${IN(...targetClass.terms)} )`,
  }
}

function toUnion(propertyPatterns: Quad[][]) {
  if (propertyPatterns.length > 1) {
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

interface PropertyShapePatterns {
  shape: GraphPointer
  focusNode: PrefixedVariable
  options: PropertyShapeOptions
  parentPatterns?: Quad[]
}

function * deepPropertyShapePatterns({ shape, focusNode, options, parentPatterns = [] }: PropertyShapePatterns): Generator<Quad[]> {
  const activeProperties = shape.out(sh.property)
    .filter(propShape => !propShape.has(sh.deactivated, TRUE).term)
    .toArray()

  for (const [index, propShape] of activeProperties.entries()) {
    const variable = options.objectVariablePrefix
      ? focusNode.extend(options.objectVariablePrefix).extend(index)
      : focusNode.extend(index)

    const path = propShape.out(sh.path)
    if (!isNamedNode(path)) {
      continue
    }

    const selfPatterns = [...parentPatterns, $rdf.quad(focusNode(), path.term, variable())]

    yield selfPatterns

    const shNodes = propShape.out(sh.node).toArray()
    for (const shNode of shNodes) {
      const deepPatterns = deepPropertyShapePatterns({
        shape: shNode,
        focusNode: variable,
        options,
        parentPatterns: selfPatterns,
      })
      for (const deepPattern of deepPatterns) {
        yield deepPattern
      }
    }
  }
}

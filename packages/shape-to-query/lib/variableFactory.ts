import { NamedNode, Variable } from 'rdf-js'
import factory from '@rdfjs/data-model'

export interface PrefixedVariable {
  (name?: string): NamedNode | Variable
  extend(suffix: unknown): PrefixedVariable
}

export function create({ prefix, focusNode }: { focusNode?: NamedNode; prefix: string }): PrefixedVariable {
  const variable = function (name = '') {
    if (focusNode) {
      return focusNode
    }

    if (!name) {
      return factory.variable(prefix)
    }

    return factory.variable(`${prefix}_${name}`)
  }

  variable.extend = (suffix: unknown) => {
    return create({ prefix: `${prefix}_${suffix}` })
  }

  return variable
}

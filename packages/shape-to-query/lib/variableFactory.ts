import { Variable } from 'rdf-js'
import factory from '@rdfjs/data-model'
import { sparql } from '@tpluscode/rdf-string'

export interface PrefixedVariable {
  (name?: string): Variable
  extend(suffix: unknown): PrefixedVariable
}

export function create(prefix: string): PrefixedVariable {
  const variable = function (name = '') {
    if (!name) {
      return factory.variable(prefix)
    }

    return factory.variable(`${prefix}_${name}`)
  }

  variable.extend = (suffix: unknown) => {
    return create(`${prefix}_${suffix}`)
  }

  variable._toPartialString = (options: any) => {
    return sparql`${variable()}`._toPartialString(options)
  }

  return variable
}

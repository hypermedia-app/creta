import { BlankNode, NamedNode, Term } from 'rdf-js'
import { hydra } from '@tpluscode/rdf-ns-builders'
import clownface, { GraphPointer } from 'clownface'
import $rdf from 'rdf-ext'
import DatasetExt from 'rdf-ext/lib/Dataset'
import type { ParsedQs } from 'qs'

const literalValueRegex = /^"(?<value>.+)"(@|\^\^)?((?<=@)(?<language>.*))?((?<=\^\^)(?<datatype>.*))?$/

function createTermFromVariable({ template, value }: {template: GraphPointer; value: string}) {
  if (!hydra.ExplicitRepresentation.equals(template.out(hydra.variableRepresentation).term)) {
    return value
  }

  const matches = value.match(literalValueRegex)
  if (matches && matches.groups) {
    let datatypeOrLanguage: string | NamedNode | undefined = matches.groups.language
    if (matches.groups.datatype) {
      datatypeOrLanguage = $rdf.namedNode(matches.groups.datatype)
    }

    return $rdf.literal(matches.groups.value, datatypeOrLanguage)
  }

  return $rdf.namedNode(value)
}

export function toPointer(template: GraphPointer, queryParams: ParsedQs): GraphPointer<BlankNode, DatasetExt> {
  const templateParams = clownface({ dataset: $rdf.dataset() }).blankNode()

  const variablePropertyMap = new Map<string, Term>()
  template.out(hydra.mapping).forEach(mapping => {
    const variable = mapping.out(hydra.variable).value
    const property = mapping.out(hydra.property).term

    if (variable && property) {
      variablePropertyMap.set(variable, property)
    }
  })

  Object.entries(queryParams).forEach(([key, param]) => {
    const values = typeof param === 'string' ? [param]
      : Array.isArray(param)
        ? param.map((item: any) => item.toString())
        : []

    const property = variablePropertyMap.get(key)

    if (!property) {
      return
    }

    const terms = values.map(value => createTermFromVariable({ template, value }))
    templateParams.addOut(property, terms)
  })

  return templateParams
}

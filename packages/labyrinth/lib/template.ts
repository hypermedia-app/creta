import { BlankNode, NamedNode, Term } from 'rdf-js'
import { hydra, xsd } from '@tpluscode/rdf-ns-builders'
import clownface, { GraphPointer } from 'clownface'
import $rdf from 'rdf-ext'
import DatasetExt from 'rdf-ext/lib/Dataset'
import type { ParsedQs } from 'qs'
import httpError from 'http-errors'
import { isUri } from 'valid-url'

const literalValueRegex = /^"(?<value>.+)"(@|\^\^)?((?<=@)(?<language>.*))?((?<=\^\^)(?<datatype>.*))?$/
const TRUE = $rdf.literal('true', xsd.boolean)

function createTermFromVariable({ variableRepresentation, value }: { variableRepresentation: Term | undefined; value: string}) {
  if (!hydra.ExplicitRepresentation.equals(variableRepresentation)) {
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

  return $rdf.namedNode(isUri(value) || encodeURI(value))
}

export function toPointer(template: GraphPointer, queryParams: ParsedQs): GraphPointer<BlankNode, DatasetExt> {
  const templateParams = clownface({ dataset: $rdf.dataset() }).blankNode()
  const templateVariableRepresentation = template.out(hydra.variableRepresentation).term

  const variablePropertyMap = new Map<string, { property: Term; variableRepresentation: Term | undefined }>()
  template.out(hydra.mapping).forEach(mapping => {
    const variable = mapping.out(hydra.variable).value
    const property = mapping.out(hydra.property).term
    const required = mapping.out(hydra.required).term?.equals(TRUE)
    const variableRepresentation = mapping.out(hydra.variableRepresentation).term

    if (variable && required && !queryParams[variable]) {
      throw new httpError.BadRequest(`Missing required template variable ${variable}`)
    }

    if (variable && property) {
      variablePropertyMap.set(variable, { property, variableRepresentation })
    }
  })

  Object.entries(queryParams).forEach(([key, param]) => {
    const values = typeof param === 'string'
      ? [param]
      : Array.isArray(param)
        ? param.map((item: any) => item.toString())
        : []

    const mapping = variablePropertyMap.get(key)

    if (!mapping) {
      return
    }

    const variableRepresentation = mapping.variableRepresentation || templateVariableRepresentation
    const terms = values.map(value => createTermFromVariable({
      variableRepresentation,
      value,
    }))
    templateParams.addOut(mapping.property, terms)
  })

  return templateParams
}

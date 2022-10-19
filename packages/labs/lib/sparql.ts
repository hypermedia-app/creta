import { sparql, SparqlTemplateResult } from '@tpluscode/sparql-builder'

export function toUnion(previous: SparqlTemplateResult, current: SparqlTemplateResult, index: number): SparqlTemplateResult {
  if (index === 0) {
    return sparql`{
      ${current}
    }`
  }

  if (index === 1) {
    return sparql`{
      ${previous}
    }  UNION {
      ${current}
    }`
  }

  return sparql`${previous}
  UNION {
    ${current}
  }`
}

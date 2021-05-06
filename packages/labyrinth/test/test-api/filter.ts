import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import type { Pattern } from '../../lib/query'

export function byTitle({ subject, predicate, object }: Pattern): SparqlTemplateResult {
  return sparql`${subject} ${predicate} ${object.term}`
}

import StreamClient from 'sparql-http-client/StreamClient'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import { DELETE, INSERT } from '@tpluscode/sparql-builder'

export const client = new StreamClient({
  endpointUrl: 'http://db.labyrinth.lndo.site/repositories/tests?infer=true',
  updateUrl: 'http://db.labyrinth.lndo.site/repositories/tests',
  user: 'minos',
  password: 'password',
})

export function testData(dataset: SparqlTemplateResult): Promise<void> {
  const del = DELETE`?s ?p ?o`.WHERE`?s ?p ?o`
  const insert = INSERT.DATA`${dataset}`

  const query = sparql`${del};${insert}`

  return client.query.update(query.toString())
}

import { NamedNode } from 'rdf-js'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { StreamClient } from 'sparql-http-client/StreamClient'

export function describeResource(term: NamedNode, client: StreamClient) {
  return DESCRIBE`${term}`.execute(client.query)
}

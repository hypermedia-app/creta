import { NamedNode, Stream } from 'rdf-js'
import { StreamClient } from 'sparql-http-client/StreamClient'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { hydra } from '@tpluscode/rdf-ns-builders'

export function loadClasses(api: NamedNode, client: StreamClient): Promise<Stream> {
  return DESCRIBE`?c ?op`
    .WHERE`{
      ?c a ${hydra.Class} ; ${hydra.apiDocumentation} ${api} .
    } union {
      ?c a ${hydra.Class} ; ${hydra.supportedOperation} ?op .
      ?op ${hydra.apiDocumentation} ${api} .
    }`
    .execute(client.query)
}

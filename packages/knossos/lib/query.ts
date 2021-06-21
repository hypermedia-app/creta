import { NamedNode, Stream } from 'rdf-js'
import { StreamClient } from 'sparql-http-client/StreamClient'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { hydra } from '@tpluscode/rdf-ns-builders'

export function loadClasses(api: NamedNode, client: StreamClient): Promise<Stream> {
  return DESCRIBE`?c ?sp ?op ?p`
    .WHERE`
    BIND ( ${api} as ?api ) .
    
    {
      ?c a ${hydra.Class} ; ${hydra.apiDocumentation} ?api.
    } union {
      ?c a ${hydra.Class} ; ${hydra.supportedOperation} ?op .
      
      FILTER (
        EXISTS { ?c ${hydra.apiDocumentation} ?api } ||
        EXISTS { ?op ${hydra.apiDocumentation} ?api }
      )
    } union {
      ?c ${hydra.supportedProperty} ?sp .
      ?sp ${hydra.property} ?p.
      ?p ${hydra.supportedOperation} ?op .
 
      FILTER (
        EXISTS { ?c ${hydra.apiDocumentation} ?api } ||
        EXISTS { ?sp ${hydra.apiDocumentation} ?api } ||
        EXISTS { ?op ${hydra.apiDocumentation} ?api }
      )
    }
    `
    .execute(client.query)
}

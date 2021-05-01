import { NamedNode, Stream } from 'rdf-js'
import { StreamClient } from 'sparql-http-client/StreamClient'
import { CONSTRUCT } from '@tpluscode/sparql-builder'
import { hydra } from '@tpluscode/rdf-ns-builders'

export function loadClasses(api: NamedNode, client: StreamClient): Promise<Stream> {
  return CONSTRUCT`?s ?p ?o . ?c ?cp ?co. ${api} ${hydra.supportedClass} ?c`
    .WHERE`
          ?c a ${hydra.Class} ;
             ${hydra.apiDocumentation} ${api} ; 
             ?cp ?co .
          ?c (<>|!<>)+ ?s .
          ?s ?p ?o .
        `.execute(client.query)
}

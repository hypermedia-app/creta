import { NamedNode, Stream, Term } from 'rdf-js'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { rdf, rdfs, sh } from '@tpluscode/rdf-ns-builders'
import { StreamClient } from 'sparql-http-client/StreamClient'

interface ShapesQuery {
  term: NamedNode
  types: Term[]
  sparql: StreamClient
}

export function shapesQuery({ term, types, sparql } :ShapesQuery): Promise<Stream> {
  const describe = DESCRIBE`?shape ?parent`
    .WHERE`
      {
        VALUES ?shape { ${types} }
        
        ?shape a ${rdfs.Class}, ${sh.NodeShape} ;
               ${rdf.type}?/${rdfs.subClassOf}* ?parent
      }
      UNION
      {
        VALUES ?class { ${types} }
        
        ?shape a ${sh.NodeShape} ; ${sh.targetClass} ?class ;
      }
      UNION
      {
        ?shape ${sh.targetNode} ${term}
      }
      `

  return describe.execute(sparql.query)
}

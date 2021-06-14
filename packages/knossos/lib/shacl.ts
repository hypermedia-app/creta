import { NamedNode, Stream, Term } from 'rdf-js'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { rdf, rdfs, sh } from '@tpluscode/rdf-ns-builders'
import { StreamClient } from 'sparql-http-client/StreamClient'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'

interface ShapesQuery {
  term: NamedNode
  types: Term[]
  sparql: StreamClient
}

function subClassShapesPatterns(parentPattern: SparqlTemplateResult) {
  return sparql`
  OPTIONAL {
    ${parentPattern}

    {
      ?parent a ${sh.NodeShape}, ${rdfs.Class} .
    }
    UNION 
    {
      ?parentShape ${sh.targetClass} ?parent .
    }
  }`
}

export function shapesQuery({ term, types, ...arg }: ShapesQuery): Promise<Stream> {
  const describe = DESCRIBE`?shape ?parent ?parentShape`
    .WHERE`
      {
        VALUES ?shape { ${types} }

        ?shape a ${rdfs.Class}, ${sh.NodeShape} .

        ${subClassShapesPatterns(sparql`
          ?shape ${rdf.type}?/${rdfs.subClassOf}* ?parent .
        `)}
      }
      UNION
      {
        VALUES ?class { ${types} }

        ?shape a ${sh.NodeShape} ; ${sh.targetClass} ?class .

        ${subClassShapesPatterns(sparql`
          ?class ${rdfs.subClassOf}+ ?parent .
        `)}
      }
      UNION
      {
        ?shape ${sh.targetNode} ${term}
      }
      `

  return describe.execute(arg.sparql.query)
}

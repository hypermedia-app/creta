import { NamedNode, Stream, Term } from 'rdf-js'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { rdf, rdfs, sh, hydra } from '@tpluscode/rdf-ns-builders/strict'
import { StreamClient } from 'sparql-http-client/StreamClient'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'

interface ShapesQuery {
  term: NamedNode
  types: Term[]
  sparql: StreamClient
  api: NamedNode
}

function subClassShapesPatterns(api: NamedNode, parentPattern: SparqlTemplateResult) {
  return sparql`
  OPTIONAL {
    ${parentPattern}

    {
      ?parent a ${sh.NodeShape}, ${rdfs.Class} ; ${hydra.apiDocumentation} ${api} .
    }
    UNION 
    {
      ?parentShape ${sh.targetClass} ?parent ; ${hydra.apiDocumentation} ${api} .
    }
  }`
}

export function shapesQuery({ term, types, api, ...arg }: ShapesQuery): Promise<Stream> {
  const describe = DESCRIBE`?shape ?parent ?parentShape`
    .WHERE`
      {
        VALUES ?shape { ${types} }

        ?shape a ${rdfs.Class}, ${sh.NodeShape} ; ${hydra.apiDocumentation} ${api} .

        ${subClassShapesPatterns(api, sparql`
          ?shape ${rdf.type}?/${rdfs.subClassOf}* ?parent .
        `)}
      }
      UNION
      {
        VALUES ?class { ${types} }

        ?shape a ${sh.NodeShape} ; ${sh.targetClass} ?class ; ${hydra.apiDocumentation} ${api} .

        ${subClassShapesPatterns(api, sparql`
          ?class ${rdfs.subClassOf}+ ?parent .
        `)}
      }
      UNION
      {
        ?shape ${sh.targetNode} ${term} ; ${hydra.apiDocumentation} ${api} .
      }
      `

  return describe.execute(arg.sparql.query)
}

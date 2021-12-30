import { NamedNode, Stream, Term, Variable } from 'rdf-js'
import $rdf from 'rdf-ext'
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

export function shapesQuery({ term, types, api, ...arg }: ShapesQuery): Promise<Stream> {
  const shape = $rdf.variable('shape')
  const parent = $rdf.variable('parent')
  const parentShape = $rdf.variable('parentShape')
  const nested = $rdf.variable('nested')

  function nestedShapesPattern(shape: Variable) {
    return sparql`OPTIONAL { { 
      ${shape} (!<>*/(${sh.and}|${sh.xone}|${sh.or}|${sh.not}))/${rdf.rest}*/${rdf.first} ${nested}
    } UNION {
      ${shape} !<>*/${sh.node} ${nested}
    } }`
  }

  function subClassShapesPatterns(parentPattern: SparqlTemplateResult) {
    return sparql`
    OPTIONAL {
      ${parentPattern}
  
      {
        ${parent} a ${sh.NodeShape}, ${rdfs.Class} ; ${hydra.apiDocumentation} ${api} .
        ${nestedShapesPattern(parent)}
      }
      UNION 
      {
        ${parentShape} ${sh.targetClass} ${parent} ; ${hydra.apiDocumentation} ${api} .
        ${nestedShapesPattern(parentShape)}
      }
    }`
  }

  const describe = DESCRIBE`${shape} ${parent} ${parentShape} ${nested}`
    .WHERE`
      {
        # implicit target
        VALUES ${shape} { ${types} }

        ${shape} a ${rdfs.Class}, ${sh.NodeShape} ; ${hydra.apiDocumentation} ${api} .

        ${nestedShapesPattern(shape)}
        
        ${subClassShapesPatterns(sparql`
          ${shape} ${rdf.type}?/${rdfs.subClassOf}* ${parent} .
        `)}
      }
      UNION
      {
        # class target
        VALUES ?class { ${types} }

        ${shape} a ${sh.NodeShape} ; ${sh.targetClass} ?class ; ${hydra.apiDocumentation} ${api} .
        
        ${nestedShapesPattern(shape)}

        ${subClassShapesPatterns(sparql`
          ?class ${rdfs.subClassOf}+ ${parent} .
        `)}
      }
      UNION
      {
        # node target
        ${shape} ${sh.targetNode} ${term} ; ${hydra.apiDocumentation} ${api} .
        ${nestedShapesPattern(shape)}
      }
      `

  return describe.execute(arg.sparql.query)
}

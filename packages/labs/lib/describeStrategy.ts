import clownface from 'clownface'
import $rdf from '@rdfjs/dataset'
import { rdf, sh } from '@tpluscode/rdf-ns-builders'

export const typeShape = clownface({ dataset: $rdf.dataset() })
  .blankNode()
  .addOut(sh.property, prop => {
    prop.addOut(sh.path, rdf.type)
  })

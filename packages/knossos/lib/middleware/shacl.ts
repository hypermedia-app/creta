import TermSet from '@rdfjs/term-set'
import { rdf } from '@tpluscode/rdf-ns-builders'
import { shaclMiddleware } from 'express-middleware-shacl'

export const shaclValidate = shaclMiddleware({
  loadShapes(req) {
    const types = new TermSet([
      ...(req.hydra.resource?.types || []),
      ...req.shacl.dataGraph.out(rdf.type).terms,
    ])

    return Promise.all([...types].map(type => req.knossos.store.load(type)))
  },
  getTerm: req => req.hydra.term,
})

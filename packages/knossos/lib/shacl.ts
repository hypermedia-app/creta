import { rdf } from '@tpluscode/rdf-ns-builders'
import { shaclMiddleware } from 'hydra-box-middleware-shacl'

export const shaclValidate = shaclMiddleware({
  async loadShapes(req, res, next) {
    const loaded = req.shacl.dataGraph.out(rdf.type).map(type => req.knossos.store.load(type.term))

    const shapes = await Promise.all(loaded)

    for (const shape of shapes) {
      req.shacl.shapesGraph.addAll(shape.dataset)
    }

    next()
  },
})

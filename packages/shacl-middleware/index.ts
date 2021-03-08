import { RequestHandler, Router } from 'express'
import asyncMiddleware from 'middleware-async'
import $rdf from 'rdf-ext'
import DatasetExt from 'rdf-ext/lib/Dataset'
import { NamedNode } from 'rdf-js'
import SHACLValidator from 'rdf-validate-shacl'
import clownface, { GraphPointer } from 'clownface'
import { ProblemDocument } from 'http-problem-details'

interface ShaclMiddlewareOptions {
  loadShapes: RequestHandler
}

declare module 'express-serve-static-core' {
  interface Request {
    shacl: {
      dataGraph: GraphPointer
      shapesGraph: DatasetExt
    }
  }
}

export const shaclMiddleware = ({ loadShapes }: ShaclMiddlewareOptions): Router => {
  const router = Router()

  router.use(asyncMiddleware(async function initShaclGraphs(req, res, next) {
    let dataGraph: GraphPointer<NamedNode>
    if (!req.dataset) {
      dataGraph = clownface({dataset: $rdf.dataset()}).node(req.hydra.term)
    } else {
      dataGraph = await req.resource()
    }

    req.shacl = {
      dataGraph,
      shapesGraph: $rdf.dataset(),
    }
    next()
  }))

  router.use(asyncMiddleware(loadShapes))

  // TODO: Load data from linked instances to be able to validate their type
  router.use(asyncMiddleware(async function validateShapes(req, res, next) {
    if (req.shacl.shapesGraph.size === 0) {
      return next()
    }

    const validationReport = new SHACLValidator(req.shacl.shapesGraph).validate(req.shacl.dataGraph.dataset)
    if (validationReport.conforms) {
      return next()
    }

    const responseReport = validationReport.results.map((r) => ({
      message: r.message.map((message) => message.value),
      path: r.path?.value,
    }))
    const response = new ProblemDocument({
      status: 400,
      title: 'Request validation error',
      detail: 'The request payload does not conform to the SHACL description of this endpoint.',
      type: 'http://tempuri.org/BadRequest',
    }, {
      report: responseReport,
    })

    res.status(400).send(response)
  }))

  return router
}

/*
export const shaclMiddleware = ({ loadResourcesTypes }: ShaclMiddlewareOptions) => asyncMiddleware(async (req, res, next) => {
  const shapes = $rdf.dataset()

  // Load data from linked instances to be able to validate their type
  const classProperties = clownface({ dataset: shapes })
    .out(sh.property)
    .has(sh.class)
    .out(sh.path)
  const linkedInstancesIds = resource.out(classProperties).terms.filter(r => r.termType !== 'BlankNode')
  const linkedInstancesQuads = await loadResourcesTypes(linkedInstancesIds)

  const dataset = $rdf.dataset([...resource.dataset, ...linkedInstancesQuads])
})
*/

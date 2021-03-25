import { Request, Router } from 'express'
import asyncMiddleware from 'middleware-async'
import $rdf from 'rdf-ext'
import DatasetExt from 'rdf-ext/lib/Dataset'
import { NamedNode } from 'rdf-js'
import SHACLValidator from 'rdf-validate-shacl'
import clownface, { GraphPointer } from 'clownface'
import { ProblemDocument } from 'http-problem-details'
import { sh } from '@tpluscode/rdf-ns-builders'
import { CONSTRUCT } from '@tpluscode/sparql-builder'
import { sparql } from '@tpluscode/rdf-string'

interface ShaclMiddlewareOptions {
  loadShapes(req: Request): Promise<GraphPointer[]>
  getTerm: (req: Request) => NamedNode
}

declare module 'express-serve-static-core' {
  interface Request {
    shacl: {
      term: NamedNode
      dataGraph: GraphPointer
      shapesGraph: DatasetExt
    }
  }
}

export const shaclMiddleware = ({ loadShapes, getTerm }: ShaclMiddlewareOptions): Router => {
  const router = Router()

  router.use(asyncMiddleware(async function initShaclGraphs(req, res, next) {
    const term = getTerm(req)

    let dataGraph: GraphPointer<NamedNode>
    if (!req.dataset) {
      dataGraph = clownface({ dataset: $rdf.dataset() }).node(term)
    } else {
      dataGraph = await req.resource()
    }

    req.shacl = {
      term,
      dataGraph,
      shapesGraph: $rdf.dataset(),
    }
    next()
  }))

  router.use(asyncMiddleware(async (req, res, next) => {
    const shapes = await loadShapes(req)

    for (const shape of shapes) {
      shape.addOut(sh.targetNode, req.shacl.term)
      req.shacl.shapesGraph.addAll([...shape.dataset])
    }

    next()
  }))

  // Load data from linked instances to be able to validate their type
  router.use(asyncMiddleware(async function loadResourceTypes(req, res, next) {
    const classProperties = clownface({ dataset: req.shacl.shapesGraph })
      .out(sh.property)
      .has(sh.class)
      .out(sh.path)
      .toArray()

    if (classProperties.length) {
      const typeQuery = classProperties.reduce((query, path, index) => {
        const pattern = sparql`${req.shacl.term} ${path.term} ?linked . ?linked a ?type`

        if (index === 0) {
          return query.WHERE`{ ${pattern} }`
        }

        return query.WHERE`union { ${pattern} }`
      }, CONSTRUCT`?linked a ?type`)

      const typeQuads = await typeQuery.execute(req.labyrinth.sparql.query)
      await req.shacl.shapesGraph.import(typeQuads)
    }

    next()
  }))

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

import { Request, RequestHandler } from 'express'
import clownface, { GraphPointer } from 'clownface'
import asyncMiddleware from 'middleware-async'
import { rdf } from '@tpluscode/rdf-ns-builders'
import { NamedNode } from 'rdf-js'
import { query } from '../namespace'
import { loaders } from '../rdfLoaders'

export interface Enrichment {
  (req: Request, pointer: GraphPointer<NamedNode>): Promise<void>
}

export function preprocessResource(basePath: string): RequestHandler {
  return asyncMiddleware(async (req, res, next) => {
    if (req.hydra.resource) {
      const resourcePointer = await req.hydra.resource.pointer()

      const enrichmentPromises = clownface(req.hydra.api)
        .node(resourcePointer.out(rdf.type).terms)
        .out(query.preprocess)
        .map(pointer => loaders.load<Enrichment>(pointer, { basePath }))

      const enrichment = await Promise.all(enrichmentPromises)
      await Promise.all(enrichment.map(enrich => enrich && enrich(req, resourcePointer)))
    }

    next()
  })
}

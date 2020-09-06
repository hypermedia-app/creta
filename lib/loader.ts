import { Term } from 'rdf-js'
import $rdf from 'rdf-ext'
import { Request, RequestHandler } from 'express'
import asyncMiddleware from 'middleware-async'
import { PropertyResource, Resource, ResourceLoader } from 'hydra-box'
import { CONSTRUCT, SELECT } from '@tpluscode/sparql-builder'
import debug from 'debug'
import ParsingClient from 'sparql-http-client/ParsingClient'
import clownface, { GraphPointer } from 'clownface'
import TermSet from '@rdfjs/term-set'
import { rdf } from '@tpluscode/rdf-ns-builders'
import { query } from './namespace'
import { loaders } from './rdfLoaders'

const log = debug('hydra:store')

interface Enrichment {
  (req: Request, pointer: GraphPointer): Promise<void>
}

export function preprocessResource(basePath: string): RequestHandler {
  return asyncMiddleware(async (req, res, next) => {
    const resourcePointer = clownface(req.hydra.resource)

    const enrichmentPromises = clownface(req.hydra.api)
      .node(resourcePointer.out(rdf.type).terms)
      .out(query.preprocess)
      .map(pointer => loaders.load<Enrichment>(pointer, { basePath }))

    const enrichment = await Promise.all(enrichmentPromises)
    await Promise.all(enrichment.map(enrich => enrich && enrich(req, resourcePointer)))

    next()
  })
}

export class SparqlQueryLoader implements ResourceLoader {
  private readonly __client: ParsingClient

  public constructor({ client }: { client: ParsingClient }) {
    this.__client = client
  }

  async load(term: Term): Promise<Resource | null> {
    const dataset = $rdf.dataset(await CONSTRUCT`?s ?p ?o`.WHERE`GRAPH ${term} { ?s ?p ?o }`.execute(this.__client.query))

    if (dataset.size === 0) {
      return null
    }

    const pointer = clownface({ dataset, term })

    return {
      term,
      dataset,
      types: new TermSet(pointer.out(rdf.type).terms),
    }
  }

  async forClassOperation(term: Term): Promise<[Resource] | []> {
    log(`loading resource ${term.value}`)
    const resource = await this.load(term)

    return resource ? [resource] : []
  }

  async forPropertyOperation(term: Term): Promise<PropertyResource[]> {
    log(`loading resource ${term.value} by object usage`)
    const bindings = await SELECT`?g ?link`
      .WHERE`GRAPH ?g { ?g ?link ${term} }`
      .execute(this.__client.query)

    const candidates = await Promise.all(bindings.map<Promise<PropertyResource | null>>(async result => {
      const resource = await this.load(result.g)
      if (!resource) return null

      return {
        property: result.link,
        object: term,
        ...resource,
      }
    }))

    return candidates.reduce<Array<PropertyResource>>((previous, current) => {
      if (!current) return previous

      return [...previous, current]
    }, [])
  }
}

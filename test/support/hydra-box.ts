import { RequestHandler } from 'express'
import { HydraBox, PropertyResource, Resource, ResourceLoader } from 'hydra-box'
import clownface, { AnyPointer } from 'clownface'
import $rdf from 'rdf-ext'
import TermSet from '@rdfjs/term-set'
import rdfHandler from '@rdfjs/express-handler'
import sinon from 'sinon'
import setLink from 'set-link'
import StreamStore from 'sparql-http-client/StreamStore'
import Endpoint from 'sparql-http-client/Endpoint'
import { NamedNode } from 'rdf-js'

interface MiddlewareOptions {
  setup?: (hydra: HydraBox) => Promise<void> | void
  user?: {
    id: NamedNode
    permissions?: string[]
    scope?: string[]
  }
  query?: AnyPointer
}

export function hydraBox({ setup, user, query }: MiddlewareOptions = {}): RequestHandler {
  const dataset = $rdf.dataset()

  const hydra: HydraBox = {
    operation: clownface({ dataset: $rdf.dataset() }).blankNode(),
    operations: [],
    term: $rdf.namedNode('request'),
    resource: {
      prefetchDataset: $rdf.dataset(),
      quadStream() {
        return dataset.toStream()
      },
      async clownface() {
        return clownface({
          term: this.term,
          dataset,
        })
      },
      dataset: async () => dataset,
      term: $rdf.namedNode('resource'),
      types: new TermSet(),
    },
    api: {
      codePath: '',
      dataset: $rdf.dataset(),
      graph: $rdf.namedNode('api-graph'),
      fromFile: sinon.stub(),
      init: sinon.stub(),
      initialized: true,
      path: '',
      rebase: sinon.stub(),
      term: $rdf.namedNode('api'),
    },
  }

  return async (req, res, next) => {
    await rdfHandler.attach(req, res)
    setLink.attach(res)

    setup && await setup(hydra)
    req.hydra = hydra
    req.user = user
    req.app.sparql = {
      store: sinon.createStubInstance(StreamStore) as any,
      query: {
        endpoint: sinon.createStubInstance(Endpoint),
        ask: sinon.stub().resolves(true),
        construct: sinon.stub().resolves($rdf.dataset().toStream()),
        select: sinon.stub().resolves([]),
        update: sinon.stub(),
      },
    }
    req.app.labyrinth = {
      collection: {
        pageSize: 12,
      },
    }
    if (query) {
      req.dataset = async () => query.dataset
    }
    return next()
  }
}

interface LoaderStubOptions {
  classResource?: Resource[]
  propertyResource?: PropertyResource[]
}

export function loader({ classResource = [], propertyResource = [] }: LoaderStubOptions = {}): ResourceLoader {
  return {
    forClassOperation: sinon.stub().resolves(classResource),
    forPropertyOperation: sinon.stub().resolves(propertyResource),
  }
}

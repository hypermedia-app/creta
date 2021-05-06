import { NamedNode } from 'rdf-js'
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
import { Api } from 'hydra-box/Api'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import { namedNode } from './nodeFactory'
import { ex } from './namespace'

interface MiddlewareOptions {
  setup?: (hydra: HydraBox) => Promise<void> | void
  user?: {
    id: NamedNode
    permissions?: string[]
    scope?: string[]
  }
  query?: AnyPointer
}

interface ApiSetup<T> {
  code?: T
}

export const api = <Code = RequestHandler>({ code }: ApiSetup<Code> = {}): Api => {
  const load = sinon.stub()
  if (code) {
    load.resolves(code)
  }

  return {
    codePath: '',
    dataset: $rdf.dataset(),
    graph: $rdf.namedNode('api-graph'),
    init: sinon.stub(),
    initialized: true,
    path: '/api',
    term: $rdf.namedNode('api'),
    loaderRegistry: {
      load,
    } as any,
  }
}

export function apiFactory<Code>(opts?: ApiSetup<Code>): () => Promise<Api> {
  return async () => {
    const copy = api(opts)

    clownface(copy)
      .addOut(hydra.supportedClass, ex.Config, Config => {
        Config.addOut(rdf.type, hydra.Class)
          .addOut(hydra.supportedOperation, op => {
            op.addOut(hydra.method, 'GET')
          })
      })

    return copy
  }
}

export function hydraBox({ setup, query }: MiddlewareOptions = {}): RequestHandler {
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
    api: api(),
  }

  return async (req, res, next) => {
    await rdfHandler.attach(req, res)
    setLink.attach(res)

    setup && await setup(hydra)
    req.hydra = hydra
    req.agent = namedNode('agent')
    req.labyrinth = {
      sparql: {
        store: sinon.createStubInstance(StreamStore) as any,
        query: {
          endpoint: sinon.createStubInstance(Endpoint),
          ask: sinon.stub().resolves(true),
          construct: sinon.stub().resolves($rdf.dataset().toStream()),
          select: sinon.stub().resolves([]),
          update: sinon.stub(),
        },
      },
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

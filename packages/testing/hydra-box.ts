import { NamedNode } from 'rdf-js'
import { RequestHandler } from 'express'
import { HydraBox, PropertyResource, Resource, ResourceLoader } from 'hydra-box'
import clownface, { AnyPointer } from 'clownface'
import $rdf from 'rdf-ext'
import TermSet from '@rdfjs/term-set'
import rdfHandler from '@rdfjs/express-handler'
import sinon from 'sinon'
import setLink from 'set-link'
import { Api } from 'hydra-box/Api'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import LoaderRegistry from 'rdf-loaders-registry'
import { namedNode } from './nodeFactory'
import { ex } from './namespace'
import { client } from './sparql'

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
    loaderRegistry: sinon.createStubInstance(LoaderRegistry, {
      load,
    }),
  }
}

export function testApi<Code>(opts?: ApiSetup<Code>): Api {
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

export async function hydraBox(setup?: MiddlewareOptions['setup']): Promise<HydraBox> {
  const dataset = $rdf.dataset()
  const hydraBox: HydraBox = {
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

  setup && await setup(hydraBox)

  return hydraBox
}

export function handler({ setup, query }: MiddlewareOptions = {}): RequestHandler {
  return async (req, res, next) => {
    await rdfHandler.attach(req, res)
    setLink.attach(res)

    req.hydra = await hydraBox(setup)
    req.agent = namedNode('agent')
    req.loadCode = sinon.stub()
    req.labyrinth = {
      sparql: client(),
      collection: {
        pageSize: 12,
      },
      async fullRepresentation() {
        return clownface({
          dataset: await $rdf.dataset().import(req.hydra.resource.quadStream()),
          term: req.hydra.resource.term,
        })
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

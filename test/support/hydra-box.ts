import { RequestHandler } from 'express'
import { HydraBox } from 'hydra-box'
import cf from 'clownface'
import $rdf from 'rdf-ext'
import TermSet from '@rdfjs/term-set'
import rdfHandler from '@rdfjs/express-handler'
import sinon from 'sinon'

interface MiddlewareOptions {
  setup?: (hydra: HydraBox) => void
  user?: {
    id: string
    permissions: []
  }
}

export function hydraBox({ setup, user }: MiddlewareOptions = {}): RequestHandler {
  const hydra: HydraBox = {
    operation: cf({ dataset: $rdf.dataset() }).blankNode(),
    term: $rdf.namedNode('request'),
    resource: {
      dataset: $rdf.dataset(),
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
    setup && setup(hydra)
    req.hydra = hydra
    req.user = user
    return next()
  }
}

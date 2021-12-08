import { NamedNode, Term } from 'rdf-js'
import express, { Request, RequestHandler } from 'express'
import clownface, { GraphPointer } from 'clownface'
import asyncMiddleware from 'middleware-async'
import { rdf } from '@tpluscode/rdf-ns-builders/strict'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import TermSet from '@rdfjs/term-set'
import { getPayload, getRepresentation } from '../request'

export interface ResourceHook {
  /**
   * Delegate for hooks which allow modifying request payloads, loaded resource representation and response representations
   *
   * @param req current express Request
   * @param pointer resource to modify (depends on kind of hook)
   */
  (req: Request, pointer: GraphPointer<NamedNode>): Promise<void> | void
}

interface PreprocessResource {
  req: express.Request
  predicate: NamedNode
  getTypes?(req: express.Request): NamedNode[] | Promise<NamedNode[]>
  getResource(req: express.Request): Promise<GraphPointer<NamedNode>> | undefined
}

function notNull<T>(arg: T | null): arg is T {
  return !!arg
}

function hydraResourceTypes(req: express.Request) {
  if (!req.hydra.resource) {
    return []
  }
  return [...req.hydra.resource.types]
}

async function resourceAndPayloadTypes(req: express.Request) {
  const types = hydraResourceTypes(req)

  if (typeof req.dataset === 'function') {
    const payloadTypes: Term[] = (await req.resource())
      .out(rdf.type)
      .terms

    return [...types, ...payloadTypes.filter(isNamedNode)]
  }

  return types
}

export async function preprocessResource({ req, getTypes = hydraResourceTypes, predicate, getResource }: PreprocessResource): Promise<void> {
  const types = await getTypes(req)
  const hooksPromised = clownface(req.hydra.api)
    .node([...new TermSet(types)])
    .out(predicate)
    .map(pointer => req.loadCode<ResourceHook>(pointer))

  const hooks = (await Promise.all(hooksPromised)).filter(notNull)
  if (!hooks.length) {
    return
  }

  const resourcePointer = await getResource(req)

  if (resourcePointer) {
    await Promise.all(hooks.map(preprocess => preprocess(req, resourcePointer)))
  }
}

export function preprocessMiddleware(arg: Omit<PreprocessResource, 'req'>): RequestHandler {
  return asyncMiddleware(async (req, res, next) => {
    await preprocessResource({ req, ...arg })

    next()
  })
}

function isNamedNode(arg: Term): arg is NamedNode {
  return arg.termType === 'NamedNode'
}

export const preprocessPayload = preprocessMiddleware({
  getResource: getPayload,
  getTypes: resourceAndPayloadTypes,
  predicate: knossos.preprocessPayload,
})

export const preprocessHydraResource = preprocessMiddleware({
  getResource: getRepresentation,
  predicate: knossos.preprocessResource,
})

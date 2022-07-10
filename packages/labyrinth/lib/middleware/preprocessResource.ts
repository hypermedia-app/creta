/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth/lib/middleware/preprocessResource
 */

import { NamedNode, Term } from 'rdf-js'
import express, { Request, RequestHandler } from 'express'
import clownface, { GraphPointer } from 'clownface'
import asyncMiddleware from 'middleware-async'
import { rdf } from '@tpluscode/rdf-ns-builders'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import TermSet from '@rdfjs/term-set'
import argumentsLoader from 'rdf-loader-code/arguments'
import { getPayload, getRepresentation } from '../request'

export interface ResourceHook<Args extends unknown[] = []> {
  /**
   * Delegate for hooks which allow modifying request payloads, loaded resource representation and response representations
   *
   * @param req current express Request
   * @param pointer resource to modify (depends on kind of hook)
   * @param args optional arguments configured in RDF
   */
  (req: Request, pointer: GraphPointer<NamedNode>, ...args: Args): Promise<void> | void
}

interface PreprocessResource {
  req: express.Request
  res: express.Response
  predicate: NamedNode
  getTypes?(req: express.Request, res: express.Response): Iterable<Term> | Promise<Iterable<Term>>
  getResource(req: express.Request, res: express.Response): Promise<GraphPointer<NamedNode>> | undefined
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
    const payloadTypes = (await req.resource())
      .out(rdf.type)
      .terms

    return [...types, ...payloadTypes]
  }

  return types
}

type AnyHook = ResourceHook<unknown[]>

export async function preprocessResource({ req, res, getTypes = hydraResourceTypes, predicate, getResource }: PreprocessResource): Promise<void> {
  const types = await getTypes(req, res)
  const { api } = req.hydra
  const hooks = await clownface(api)
    .node([...new TermSet([...types].filter(isNamedNode))])
    .out(predicate)
    .toArray()
    .reduce(async (previous: Promise<[AnyHook, unknown[]][]>, pointer): Promise<[AnyHook, unknown[]][]> => {
      const hook = await req.loadCode<ResourceHook>(pointer)
      if (!hook) {
        return previous
      }

      const args = await argumentsLoader(pointer, {
        loaderRegistry: api.loaderRegistry,
      })
      return [...await previous, [hook, args]]
    }, Promise.resolve([]))

  if (!hooks.length) {
    return
  }

  const resourcePointer = await getResource(req, res)

  if (resourcePointer) {
    await Promise.all(hooks.map(([hook, args]) => {
      req.knossos.log(`Running resource hook ${hook.name} <${predicate.value}>`)
      return hook(req, resourcePointer, ...args)
    }))
  }
}

export function preprocessMiddleware(arg: Omit<PreprocessResource, 'req' | 'res'>): RequestHandler {
  return asyncMiddleware(async (req, res, next) => {
    await preprocessResource({ req, res, ...arg })

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

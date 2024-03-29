/**
 * @packageDocumentation
 * @module @hydrofoil/knossos/lib/settings
 */

import { NamedNode, Term } from 'rdf-js'
import * as express from 'express'
import { Api } from 'hydra-box/Api'
import { Debugger } from 'debug'
import { loadImplementations } from '@hydrofoil/labyrinth/lib/code'
import { knossos, code } from '@hydrofoil/vocabularies/builders'
import { hydra, schema } from '@tpluscode/rdf-ns-builders'
import { AuthorizationPatterns } from 'rdf-web-access-control'
import { GraphPointer } from 'clownface'
import toArray from 'stream-to-array'
import { SELECT } from '@tpluscode/sparql-builder'
import { ResourceLoader } from 'hydra-box'
import { MinimalRepresentationLoader } from '@hydrofoil/labyrinth/lib/middleware/returnMinimal'
import { isGraphPointer } from 'is-graph-pointer'
import asyncMiddleware from 'middleware-async'
import type { ErrorMapperConstructor } from '@hydrofoil/labyrinth/lib/error'
import type { Context } from '..'

/**
 * Creates express middleware to be loaded by knossos
 */
export interface MiddlewareFactory<Args extends unknown[] = []> {
  (context: Context, ...args: Partial<Args>): express.RequestHandler | Promise<express.RequestHandler>
}

export interface ResourceLoaderFactory<Args extends unknown[] = []> {
  (context: Context, ...args: Partial<Args>): ResourceLoader | Promise<ResourceLoader>
}

async function getConfigurationId(api: Api, context: Context): Promise<Term | undefined> {
  const [match] = await toArray(await SELECT`?config`.WHERE`
    ?config a ${knossos.Configuration} ; ${hydra.apiDocumentation} ${api.term}
  `.execute(context.client.query))

  return match?.config
}

export async function loadConfiguration(api: Api, context: Context): Promise<GraphPointer | undefined> {
  const configUri = await getConfigurationId(api, context)
  if (!configUri) {
    return undefined
  }

  return context.store.load(configUri)
}

export async function loadMiddlewares(
  api: Api,
  log: Debugger,
  context: Context,
  { config }: { config?: GraphPointer },
): Promise<Record<string, express.RequestHandler[]>> {
  if (!isGraphPointer(config)) {
    return {}
  }

  const middlewares = await loadImplementations<MiddlewareFactory<unknown[]>>(
    config.out(knossos.middleware),
    { api, log },
    { throwWhenLoadFails: true },
  )

  return middlewares.reduce(async (previous, [factory, args, node]) => {
    const map = await previous
    const [name] = node.out(schema.name).values
    if (!(name in map)) {
      map[name] = []
    }

    log(`Loaded ${name} middleware from ${node.out(code.link).value}`)
    map[name].push(await factory(context, ...args))

    return map
  }, Promise.resolve<Record<string, express.RequestHandler[]>>({}))
}

export async function loadAuthorizationPatterns(
  api: Api,
  log: Debugger,
  { config }: { config?: GraphPointer },
): Promise<AuthorizationPatterns[]> {
  if (!isGraphPointer(config)) {
    return []
  }

  const authorizationPattern = await loadImplementations<AuthorizationPatterns>(
    config.out(knossos.authorizationRule),
    { api, log },
    { throwWhenLoadFails: true })

  return authorizationPattern.map(([patternFactory, , node]) => {
    log(`Loaded authorization rule ${node.out(code.link).value}`)
    return patternFactory
  })
}

export async function loadResourceLoader(
  api: Api,
  log: Debugger,
  context: Context,
  { config }: { config?: GraphPointer },
): Promise<ResourceLoader | undefined> {
  if (!isGraphPointer(config)) {
    return undefined
  }

  const loaded = (await loadImplementations<ResourceLoaderFactory<unknown[]>>(
    config.out(knossos.resourceLoader),
    { api, log },
    { throwWhenLoadFails: true, single: true },
  )).shift()

  if (!loaded) {
    return undefined
  }

  const [loaderFactory, args, node] = loaded
  const loader = await loaderFactory(context, ...args)

  log(`Loaded resource loader ${node.out(code.link).value}`)
  return loader
}

export async function loadMinimalRepresentation(api: Api, log: Debugger, config?: GraphPointer): Promise<MinimalRepresentationLoader | undefined> {
  if (!isGraphPointer(config)) {
    return undefined
  }

  const loaded = (await loadImplementations<MinimalRepresentationLoader>(
    config.out(knossos.minimalRepresentationLoader),
    { api, log },
    { throwWhenLoadFails: true, single: true },
  )).shift()

  if (!loaded) {
    return undefined
  }

  const [minimalRepresentation, , node] = loaded
  log(`Loaded minimal representation factory ${node.out(code.link).value}`)
  return minimalRepresentation
}

export function overrideLoader({ term, name }: { term: NamedNode; name: string }): express.RequestHandler {
  return asyncMiddleware(async (req, res, next) => {
    if (!res.locals[name]) {
      const codeNode = req.knossos.config
        .out(knossos.override)
        .has(schema.identifier, term)
        .out(code.implementedBy)

      if (isGraphPointer(codeNode)) {
        res.locals[name] = await req.loadCode(codeNode)
      }
    }

    next()
  })
}

export async function loadErrorMappers({ req }: {req: express.Request}): Promise<ErrorMapperConstructor[]> {
  try {
    const config = req.knossos.config
    const loaded = await loadImplementations<ErrorMapperConstructor>(config.out(knossos.errorMapper), req)
    return loaded.map(([ErrorMapper]) => ErrorMapper)
  } catch (e) {
    req.knossos.log('An error occurred when loading error mappers')
    req.knossos.log(e)
    return []
  }
}

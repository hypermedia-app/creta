/**
 * @packageDocumentation
 * @module @hydrofoil/knossos/lib/settings
 */

import { Term } from 'rdf-js'
import * as express from 'express'
import { Api } from 'hydra-box/Api'
import { Debugger } from 'debug'
import { codeLoader } from '@hydrofoil/labyrinth/lib/code'
import { knossos, code } from '@hydrofoil/vocabularies/builders'
import { hydra, schema } from '@tpluscode/rdf-ns-builders/strict'
import { AuthorizationPatterns } from 'rdf-web-access-control'
import { GraphPointer } from 'clownface'
import toArray from 'stream-to-array'
import { SELECT } from '@tpluscode/sparql-builder'
import { ResourceLoader } from 'hydra-box'
import type { Context } from '..'

/**
 * Creates express middleware to be loaded by knossos
 */
export interface MiddlewareFactory {
  (context: Context): express.RequestHandler | Promise<express.RequestHandler>
}

export interface ResourceLoaderFactory {
  (context: Context): ResourceLoader | Promise<ResourceLoader>
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
  const loadCode = codeLoader(api)

  const middlewares = config?.out(knossos.middleware).toArray() || []

  return middlewares.reduce(async (previous, next) => {
    const map = await previous
    const [name] = next.out(schema.name).values
    const [link] = next.out(code.implementedBy).toArray()
    if (!link) {
      throw new Error(`Missing implementation for middleware '${name}'`)
    }

    if (!(name in map)) {
      map[name] = []
    }

    const factory = await loadCode<MiddlewareFactory>(link)
    if (!factory) {
      throw new Error(`Failed to load ${name} middleware from ${link.out(code.link).value}`)
    } else {
      log(`Loaded ${name} middleware from ${link.out(code.link).value}`)
      map[name].push(await factory(context))
    }

    return map
  }, Promise.resolve<Record<string, express.RequestHandler[]>>({}))
}

export async function loadAuthorizationPatterns(
  api: Api,
  log: Debugger,
  { config }: { config?: GraphPointer },
): Promise<AuthorizationPatterns[]> {
  const loadCode = codeLoader(api)

  const authorizationPattern = config?.out(knossos.authorizationRule).toArray() || []

  return authorizationPattern.reduce(async (previous, next) => {
    const arr = await previous
    const [link] = next.out(code.implementedBy).toArray()

    const patternFactory = await loadCode<AuthorizationPatterns>(link)
    if (!patternFactory) {
      throw new Error(`Failed to load ${link.out(code.link).value}`)
    }

    log(`Loaded authorization rule ${link.out(code.link).value}`)
    return [
      ...arr,
      patternFactory,
    ]
  }, Promise.resolve<AuthorizationPatterns[]>([]))
}

export async function loadLoader(
  api: Api,
  log: Debugger,
  context: Context,
  { config }: { config?: GraphPointer },
): Promise<ResourceLoader | undefined> {
  const loadCode = codeLoader(api)

  const loaderFactoryLoader = config?.out(knossos.resourceLoader).toArray().shift()
  if (!loaderFactoryLoader) {
    return undefined
  }

  const loaderFactory = await loadCode<ResourceLoaderFactory>(loaderFactoryLoader)
  if (!loaderFactory) {
    throw new Error(`Failed to load loader factory ${loaderFactoryLoader.out(code.link).value}`)
  }

  const loader = await loaderFactory(context)

  log(`Loaded resource loader ${loaderFactoryLoader.out(code.link).value}`)
  return loader
}

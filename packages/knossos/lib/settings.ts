/**
 * @packageDocumentation
 * @module @hydrofoil/knossos/lib/settings
 */

import { Term } from 'rdf-js'
import * as express from 'express'
import { Api } from 'hydra-box/Api'
import { Debugger } from 'debug'
import { codeLoader } from '@hydrofoil/labyrinth/lib/code'
import toArray from 'stream-to-array'
import { SELECT } from '@tpluscode/sparql-builder'
import { knossos, code } from '@hydrofoil/vocabularies/builders/strict'
import { hydra, schema } from '@tpluscode/rdf-ns-builders/strict'
import type { Context } from '../server'

/**
 * Creates express middleware to be loaded by knossos
 */
export interface MiddlewareFactory {
  (context: Context): express.RequestHandler | Promise<express.RequestHandler>
}

async function defaultConfigurationQuery(api: Api, context: Context): Promise<Term | undefined> {
  const [match] = await toArray(await SELECT`?config`.WHERE`
    ?config a ${knossos.Configuration} ; ${hydra.apiDocumentation} ${api.term}
  `.execute(context.client.query))

  return match.config
}

export async function loadMiddlewares(
  api: Api,
  log: Debugger,
  context: Context,
  { getConfigurationId = defaultConfigurationQuery }: { getConfigurationId?: typeof defaultConfigurationQuery } = {},
): Promise<Record<string, express.RequestHandler[]>> {
  const loadCode = codeLoader(api)

  const configUri = await getConfigurationId(api, context)

  if (!configUri) {
    log('No configuration resource found')
    return {}
  }

  const config = await context.store.load(configUri)
  const middlewares = config.out(knossos.middleware).toArray()

  return middlewares.reduce(async (previous, next) => {
    const map = await previous
    const [name] = next.out(schema.name).values
    const [link] = next.out(code.implementedBy).toArray()
    if (!link) {
      log(`Missing implementation for middleware '${name}'`)
      return map
    }

    if (!(name in map)) {
      map[name] = []
    }

    const factory = await loadCode<MiddlewareFactory>(link)
    if (!factory) {
      log(`Failed to load middleware ${name} from ${link.out(code.link).value}`)
    } else {
      map[name].push(await factory(context))
    }

    return map
  }, Promise.resolve<Record<string, express.RequestHandler[]>>({}))
}

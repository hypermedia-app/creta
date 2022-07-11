import { Api } from 'hydra-box/Api'
import { GraphPointer, MultiPointer } from 'clownface'
import argumentsLoader from 'rdf-loader-code/arguments'
import express from 'express'
import RdfResource from '@tpluscode/rdfine'
import { code } from '@hydrofoil/vocabularies/builders'
import { isGraphPointer } from 'is-graph-pointer'
import { Debugger } from 'debug'

export interface CodeLoader {
  <T = unknown>(node: GraphPointer, options?: Record<any, any>): T | Promise<T> | null
}

export function codeLoader(api: Api): CodeLoader {
  return (node, options) => {
    return api.loaderRegistry.load<any>(node, {
      basePath: api.codePath,
      ...(options || {}),
    })
  }
}

interface Options {
  throwWhenLoadFails?: boolean
  single?: boolean
}

interface Context {
  api: Api
  log?: Debugger
}

type LoadedTuple<T> = [T, unknown[], GraphPointer]
export async function loadImplementations<T>(pointers: MultiPointer, context: Context | express.Request, { throwWhenLoadFails = false, single = false }: Options = {}): Promise<LoadedTuple<T>[]> {
  let api: Api
  let log: Debugger | undefined
  if ('api' in context) {
    ({ api, log } = context)
  } else {
    api = context.hydra.api
    log = context.knossos.log
  }

  const { loaderRegistry } = api
  const loadCode = codeLoader(api)

  const implementations = pointers.toArray()
  if (single && implementations.length > 1) {
    throw new Error('Only one implementation allowed')
  }

  return implementations
    .reduce(async (previous: Promise<LoadedTuple<T>[]>, pointer): Promise<LoadedTuple<T>[]> => {
      const impl = pointer.out(code.implementedBy)
      if (!isGraphPointer(impl)) {
        log?.('Missing code:implementedBy for node %s', pointer.value)
        if (throwWhenLoadFails) {
          throw new Error('Missing code:implementedBy')
        }
        return previous
      }

      const hook = await loadCode<T>(impl)
      if (!hook) {
        const jsonLd = RdfResource.factory.createEntity(pointer).toJSON()
        log?.('Failed to load code %O', jsonLd)
        if (throwWhenLoadFails) {
          throw new Error(`Failed to load ${JSON.stringify(jsonLd)}`)
        }
        return previous
      }

      const args = await argumentsLoader(pointer, {
        loaderRegistry,
      })
      return [...await previous, [hook, args, pointer]]
    }, Promise.resolve([]))
}

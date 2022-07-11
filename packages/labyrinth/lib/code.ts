import { Api } from 'hydra-box/Api'
import { GraphPointer, MultiPointer } from 'clownface'
import argumentsLoader from 'rdf-loader-code/arguments'
import express from 'express'
import RdfResource from '@tpluscode/rdfine'
import { code } from '@hydrofoil/vocabularies/builders'
import { isGraphPointer } from 'is-graph-pointer'

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
}

type LoadedTuple<T> = [T, unknown[], GraphPointer]
export async function loadAll<T>(pointers: MultiPointer, req: express.Request, { throwWhenLoadFails = false }: Options = {}): Promise<LoadedTuple<T>[]> {
  const { loaderRegistry } = req.hydra.api
  return pointers.toArray()
    .reduce(async (previous: Promise<LoadedTuple<T>[]>, pointer): Promise<LoadedTuple<T>[]> => {
      const impl = pointer.out(code.implementedBy)
      if (!isGraphPointer(impl)) {
        req.knossos.log('Missing code:implementedBy for node %s', pointer.value)
        if (throwWhenLoadFails) {
          throw new Error('Missing code:implementedBy')
        }
        return previous
      }

      const hook = await req.loadCode<T>(impl)
      if (!hook) {
        const jsonLd = RdfResource.factory.createEntity(pointer).toJSON()
        req.knossos.log('Failed to load code %O', jsonLd)
        if (throwWhenLoadFails) {
          throw new Error(`Failed to load ${pointer.value}`)
        }
        return previous
      }

      const args = await argumentsLoader(pointer, {
        loaderRegistry,
      })
      return [...await previous, [hook, args, pointer]]
    }, Promise.resolve([]))
}

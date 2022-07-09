import { Term } from 'rdf-js'
import { IriTemplate } from '@rdfine/hydra/lib/IriTemplate'
import { hydra } from '@tpluscode/rdf-ns-builders'
import type { GraphPointer } from 'clownface'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import { Request } from 'express'
import $rdf from 'rdf-ext'
import clownface from 'clownface'
import argumentsLoader from 'rdf-loader-code/arguments'

export interface TransformVariable<Args extends unknown[] = []> {
  (term: Term, ...args: Args): Term
}

export function hasAllRequiredVariables(template: IriTemplate, variables: GraphPointer): boolean {
  for (const mapping of template.mapping) {
    const { property, required } = mapping

    if (property && required) {
      if (!variables.out(property.id).terms.length) {
        return false
      }
    }
  }

  return true
}

export async function applyTransformations(req: Request, resource: GraphPointer, template: GraphPointer): Promise<GraphPointer> {
  const { api } = req.hydra
  const mappings = template.out(hydra.mapping).toArray()
  const variables = clownface({ dataset: $rdf.dataset() }).blankNode()

  for (const mapping of mappings) {
    const transformations = mapping.out(knossos.transformVariable).toArray()
    const property = mapping.out(hydra.property)

    const transformed = resource.out(property).toArray()
      .map(async object => {
        return transformations.reduce((promise, transformation) => {
          return promise.then(async previous => {
            const transformFunc = await req.loadCode<TransformVariable<unknown[]>>(transformation, { basePath: api.codePath })
            const args = await argumentsLoader(mapping, {
              loaderRegistry: api.loaderRegistry,
            })
            if (transformFunc) {
              return transformFunc(previous, ...args)
            }

            throw new Error('Failed to load transformation ' + transformation.value)
          })
        }, Promise.resolve(object.term))
      })

    variables.addOut(property, await Promise.all(transformed))
  }

  return variables
}

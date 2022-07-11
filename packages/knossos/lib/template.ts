import { Term } from 'rdf-js'
import { IriTemplate } from '@rdfine/hydra/lib/IriTemplate'
import { hydra } from '@tpluscode/rdf-ns-builders'
import type { GraphPointer } from 'clownface'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import { Request } from 'express'
import $rdf from 'rdf-ext'
import clownface from 'clownface'
import { loadImplementations } from '@hydrofoil/labyrinth/lib/code'

export interface TransformVariable<Args extends unknown[] = []> {
  (term: Term, ...args: Args): Term
}

export function hasAllRequiredVariables({ mapping }: IriTemplate, variables: GraphPointer): boolean {
  for (const { property, required } of mapping) {
    if (property && required) {
      if (!variables.out(property.id).terms.length) {
        return false
      }
    }
  }

  return true
}

export async function applyTransformations(req: Request, resource: GraphPointer, template: GraphPointer): Promise<GraphPointer> {
  const mappings = template.out(hydra.mapping).toArray()
  const variables = clownface({ dataset: $rdf.dataset() }).blankNode()

  for (const mapping of mappings) {
    const transformationPtrs = mapping.out(knossos.transformVariable)
    const property = mapping.out(hydra.property)

    const transformed = resource.out(property).toArray()
      .map(async object => {
        const transformations = await loadImplementations<TransformVariable<unknown[]>>(transformationPtrs, req, {
          throwWhenLoadFails: true,
        })

        return transformations.reduce((promise, [transformFunc, args]) => {
          return promise.then(async previous => {
            return transformFunc(previous, ...args)
          })
        }, Promise.resolve(object.term))
      })

    variables.addOut(property, await Promise.all(transformed))
  }

  return variables
}

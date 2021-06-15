import { Term } from 'rdf-js'
import { IriTemplate } from '@rdfine/hydra/lib/IriTemplate'
import { hydra } from '@tpluscode/rdf-ns-builders'
import type { GraphPointer } from 'clownface'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import { Request } from 'express'

export interface TransformVariable {
  (term: Term): Term
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

export async function applyTransformations(req: Request, resource: GraphPointer, template: GraphPointer): Promise<void> {
  const { api } = req.hydra
  const mappingsWithTransform = template.out(hydra.mapping).has(knossos.transformVariable).toArray()

  for (const mapping of mappingsWithTransform) {
    const transformations = mapping.out(knossos.transformVariable).toArray()
    const property = mapping.out(hydra.property)

    const transformed = resource.out(property).toArray()
      .map(async object => {
        return transformations.reduce((promise, transformation) => {
          return promise.then(async previous => {
            const transformFunc = await req.loadCode<TransformVariable>(transformation, { basePath: api.codePath })
            if (transformFunc) {
              return transformFunc(previous)
            }

            throw new Error('Failed to load transformation ' + transformation.value)
          })
        }, Promise.resolve(object.term))
      })

    resource.deleteOut(property).addOut(property, await Promise.all(transformed))
  }
}

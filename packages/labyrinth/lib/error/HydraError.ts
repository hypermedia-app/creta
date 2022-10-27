import { HttpError } from 'http-errors'
import { ProblemDocument } from 'http-problem-details'
import { hydra } from '@tpluscode/rdf-ns-builders'
import type { ErrorMapperConstructor } from './index'

export function HydraError(Base: ErrorMapperConstructor) {
  return class extends Base {
    mapError(error: Error | HttpError): ProblemDocument {
      const document = super.mapError(error)

      if (!document.status) {
        if ('status' in error) {
          document.status = error.status
        } else {
          document.status = 500
        }
      }

      (document as any)['@type'] = hydra.Error.value

      return document
    }
  }
}

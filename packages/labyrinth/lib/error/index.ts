import { ErrorMapper } from 'http-problem-details-mapper'
import { HttpError } from 'http-errors'
import { ProblemDocument } from 'http-problem-details'
import { hydra } from '@tpluscode/rdf-ns-builders/strict'

export { NotFoundError } from './NotFound'

export class AnyErrorMapper extends ErrorMapper {
  public constructor() {
    super(Error)
  }

  mapError(error: Error | HttpError): ProblemDocument {
    let type = 'http://tempuri.org/InternalServerError'
    let status = 500

    if ('status' in error) {
      type = 'http://tempuri.org/NotFoundError'
      status = error.status
    }

    return new ProblemDocument({
      status,
      title: error.name,
      detail: error.message,
      type,
    }, {
      '@type': hydra.Error.value,
    })
  }
}

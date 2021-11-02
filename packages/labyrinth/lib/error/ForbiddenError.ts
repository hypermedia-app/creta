import { ErrorMapper } from 'http-problem-details-mapper'
import { ProblemDocument } from 'http-problem-details'
import error from 'http-errors'
import { hydra } from '@tpluscode/rdf-ns-builders/strict'

export class ForbiddenErrorMapper extends ErrorMapper {
  public constructor() {
    super(error.Forbidden)
  }

  public mapError(error: Error): ProblemDocument {
    return new ProblemDocument({
      title: 'Access denied',
      detail: error.message,
      status: 403,
    }, {
      '@type': hydra.Error.value,
    })
  }
}

import { ErrorMapper } from 'http-problem-details-mapper'
import { ProblemDocument } from 'http-problem-details'
import error from 'http-errors'

export class ForbiddenErrorMapper extends ErrorMapper {
  public constructor() {
    super(error.Forbidden)
  }

  public mapError(error: Error): ProblemDocument {
    return new ProblemDocument({
      title: 'Access denied',
      detail: error.message,
      status: 403,
    })
  }
}

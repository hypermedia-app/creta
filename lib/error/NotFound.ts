import { ErrorMapper } from 'http-problem-details-mapper'
import { ProblemDocument } from 'http-problem-details'

export class NotFoundError extends Error {
}

export class NotFoundErrorMapper extends ErrorMapper {
  public constructor() {
    super(NotFoundError)
  }

  public mapError(error: Error): ProblemDocument {
    return new ProblemDocument({
      status: 404,
      title: 'Resource not found',
      detail: error.message,
      type: 'http://tempuri.org/NotFoundError',
    })
  }
}

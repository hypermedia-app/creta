import { IErrorMapper } from 'http-problem-details-mapper'
import { ProblemDocument } from 'http-problem-details'

export class UnauthorizedErrorMapper implements IErrorMapper {
  public readonly error: string

  public constructor() {
    this.error = 'UnauthorizedError'
  }

  public mapError(error: Error): ProblemDocument {
    return new ProblemDocument({
      title: 'Unauthorized',
      detail: error.message,
      status: error.message === 'Permission denied' ? 403 : 401,
    })
  }
}

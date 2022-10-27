import { ErrorMapper } from 'http-problem-details-mapper'
import { ProblemDocument } from 'http-problem-details'
import error from 'http-errors'

export class UnauthorizedErrorMapper extends ErrorMapper {
  public constructor() {
    super(error.Unauthorized)
  }

  public mapError(error: Error): ProblemDocument {
    return new ProblemDocument({
      title: 'Login required',
      detail: error.message,
      status: 401,
    })
  }
}

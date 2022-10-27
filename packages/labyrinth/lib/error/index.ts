import { ErrorMapper, IErrorMapper } from 'http-problem-details-mapper'
import { HttpError } from 'http-errors'
import { ProblemDocument } from 'http-problem-details'

export { NotFoundError } from './NotFound'
export type ErrorMapperConstructor = new () => IErrorMapper

export class FallbackErrorMapper extends ErrorMapper {
  public constructor() {
    super(Error)
  }

  mapError(error: Error | HttpError): ProblemDocument {
    return new ProblemDocument({
      title: error.name,
      detail: error.message,
    })
  }
}

import { HttpProblemResponse } from 'express-http-problem-details'
import { DefaultMappingStrategy, IErrorMapper, MapperRegistry } from 'http-problem-details-mapper'
import { NotFoundErrorMapper } from './error/NotFound'
import { UnauthorizedErrorMapper } from './error/UnauthorizedError'

export const httpProblemMiddleware = (mappers: IErrorMapper[]) => {
  const defaultRegistry = new MapperRegistry().registerMapper(new NotFoundErrorMapper()).registerMapper(new UnauthorizedErrorMapper())

  const registry = mappers.reduce(
    (r, mapper) => {
      return r.registerMapper(mapper)
    },
    defaultRegistry)

  return HttpProblemResponse({ strategy: new DefaultMappingStrategy(registry) })
}

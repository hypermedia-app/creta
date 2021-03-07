import { describe } from 'mocha'
import express from 'express'
import request from 'supertest'
import { IErrorMapper } from 'http-problem-details-mapper'
import { ProblemDocument } from 'http-problem-details'
import httpError from 'http-errors'
import { httpProblemMiddleware } from '../../../lib/problemDetails'

describe('labyrinth/lib/middleware/httpProblemMiddleware', () => {
  it('allows replacing default mappers', async () => {
    // given
    class TestMapper implements IErrorMapper {
      readonly error = 'NotFoundError'

      mapError() {
        return new ProblemDocument({
          status: 500,
          detail: 'test problem document',
        })
      }
    }

    const app = express()
    app.use((_req, _res, next) => next(new httpError.NotFound()))
    app.use(httpProblemMiddleware(new TestMapper()))

    // when
    const response = request(app).get('/')

    // then
    await response.expect({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'test problem document',
    })
  })
})

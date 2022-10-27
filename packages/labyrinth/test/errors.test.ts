import { expect } from 'chai'
import express from 'express'
import request from 'supertest'
import error from 'http-errors'
import { IErrorMapper } from 'http-problem-details-mapper'
import { ProblemDocument } from 'http-problem-details'
import { hydra } from '@tpluscode/rdf-ns-builders'
import { problemJson } from '../errors'

describe('errors', () => {
  describe('problemJson', () => {
    it('return problem+json on errors', async () => {
      // given
      const app = express()
      app.use((req, res, next) => next(new Error()))
      app.use(problemJson())

      // when
      const response = request(app).get('/')

      // then
      await response
        .expect(500)
        .expect('content-type', /application\/problem\+json/)
    })

    it('ignores not handled request by default', async () => {
      // given
      const app = express()
      app.use(problemJson())

      // when
      const response = request(app).get('/')

      // then
      await response
        .expect(404)
        .expect('content-type', /text\/html/)
    })

    it('can return problem+json on implicit not found', async () => {
      // given
      const app = express()
      app.use(problemJson({ captureNotFound: true }))

      // when
      const response = request(app).get('/')

      // then
      await response
        .expect(404)
        .expect('content-type', /application\/problem\+json/)
    })

    it('handles Forbidden', async () => {
      // given
      const app = express()
      app.use((req, res, next) => next(new error.Forbidden('NO!')))
      app.use(problemJson())

      // when
      const response = request(app).get('/')

      // then
      const body = await response
        .expect(403)
        .expect('content-type', /application\/problem\+json/)
      expect(body.body).to.have.property('detail', 'NO!')
    })

    it('handles Unauthorized', async () => {
      // given
      const app = express()
      app.use((req, res, next) => next(new error.Unauthorized('NOPE!')))
      app.use(problemJson())

      // when
      const response = request(app).get('/')

      // then
      const body = await response
        .expect(401)
        .expect('content-type', /application\/problem\+json/)
      expect(body.body).to.have.property('detail', 'NOPE!')
    })

    it('handles any error', async () => {
      // given
      const app = express()
      app.use((req, res, next) => next(new error.BadRequest('foobar')))
      app.use(problemJson())

      // when
      const response = request(app).get('/')

      // then
      const body = await response
        .expect(400)
        .expect('content-type', /application\/problem\+json/)
      expect(body.body).to.have.property('status', 400)
      expect(body.body).to.have.property('detail', 'foobar')
    })

    it('ensures @type is added to any document', async () => {
      // given
      class TeapotMapper implements IErrorMapper {
        get error() {
          return 'ImATeapot'
        }

        mapError() {
          return new ProblemDocument({
            status: 418,
          })
        }
      }

      const app = express()
      app.use((req, res, next) => next(new error.ImATeapot('foobar')))
      app.use(problemJson({
        errorMappers: [TeapotMapper],
      }))

      // when
      const response = request(app).get('/')

      // then
      const body = await response
      expect(body.body).to.have.property('@type', hydra.Error.value)
    })

    it('ensures status is added to any document', async () => {
      // given
      class LoopDetectedMapper implements IErrorMapper {
        get error() {
          return 'ImATeapot'
        }

        mapError() {
          return new ProblemDocument({})
        }
      }

      const app = express()
      app.use((req, res, next) => next(new error.LoopDetected('foobar')))
      app.use(problemJson({
        errorMappers: [LoopDetectedMapper],
      }))

      // when
      const response = request(app).get('/')

      // then
      await response.expect(508)
    })

    it('keeps status if added by mapper', async () => {
      // given
      class CatchallMapper implements IErrorMapper {
        get error() {
          return 'Error'
        }

        mapError() {
          return new ProblemDocument({
            status: 999,
          })
        }
      }

      const app = express()
      app.use((req, res, next) => next(new Error()))
      app.use(problemJson({
        errorMappers: [CatchallMapper],
      }))

      // when
      const response = request(app).get('/')

      // then
      await response.expect(999)
    })
  })
})

import { describe, it } from 'mocha'
import path from 'path'
import express from 'express'
import request from 'supertest'
import $rdf from 'rdf-ext'
import TermSet from '@rdfjs/term-set'
import { hydra } from '@tpluscode/rdf-ns-builders'
import { hydraBox } from '../index'
import { ex } from './support/namespace'
import { loader } from './support/hydra-box'

describe('labyrinth', () => {
  const baseUri = ex().value
  const apiPath = path.resolve(__dirname, 'test-api')
  const codePath = path.resolve(__dirname, '..')

  it('returns 404 problem+json when no operation is found', async () => {
    // given
    const app = express()
    app.use(await hydraBox({
      baseUri,
      apiPath,
      codePath,
      loader: loader(),
    }))

    // when
    const response = request(app).get('/')

    // then
    await response
      .expect(404)
      .expect('content-type', /application\/problem\+json/)
  })

  it('returns 401 problem+json when handler returns UnauthorizedError', async () => {
    // given
    const app = express()
    app.use(await hydraBox({
      baseUri,
      apiPath,
      codePath,
      loader: loader({
        classResource: [{
          dataset: $rdf.dataset(),
          term: ex(),
          types: new TermSet([ex.Authenticated, hydra.Resource]),
        }],
      }),
    }))

    // when
    const response = request(app).get('/').set('host', 'example.com')

    // then
    await response
      .expect(401)
      .expect('content-type', /application\/problem\+json/)
  })

  it('returns 403 problem+json when handler returns ForbiddenError', async () => {
    // given
    const app = express()
    app.use(await hydraBox({
      baseUri,
      apiPath,
      codePath,
      loader: loader({
        classResource: [{
          dataset: $rdf.dataset(),
          term: ex(),
          types: new TermSet([ex.Protected]),
        }],
      }),
    }))

    // when
    const response = request(app).get('/').set('host', 'example.com')

    // then
    await response
      .expect(403)
      .expect('content-type', /application\/problem\+json/)
  })
})

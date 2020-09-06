import { describe, it } from 'mocha'
import path from 'path'
import express from 'express'
import request from 'supertest'
import { expect } from 'chai'
import { hydraBox } from '../index'
import { ex } from './support/namespace'
import { loader } from './support/hydra-box'

describe('labyrinth', () => {
  const baseUri = ex().value
  const apiPath = path.resolve(__dirname, 'test-api')
  const codePath = __dirname

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
    const { status, headers } = await request(app).get('/')

    // then
    expect(status).to.eq(404)
    expect(headers).to.have.property('content-type')
    expect(headers['content-type']).to.include('application/problem+json')
  })
})

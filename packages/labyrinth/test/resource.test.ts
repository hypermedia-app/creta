import { describe, it } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import request from 'supertest'
import { hydraBox } from '@labyrinth/testing/hydra-box'
import { StreamClient } from 'sparql-http-client/StreamClient'
import sinon from 'sinon'
import { get } from '../resource'

describe('@hydrofoil/labyrinth/resource', () => {
  describe('get', () => {
    it('returns 200 OK', async () => {
      // given
      const app = express()
      app.use(hydraBox())
      app.use(get)

      // when
      const { status } = await request(app).get('/')

      // then
      expect(status).to.eq(200)
    })

    it('returns hydra-box-loaded representation on minimal response', async () => {
      // given
      const app = express()
      app.use(hydraBox())
      app.use(get)

      // when
      const response = request(app)
        .get('/')
        .set('Prefer', 'return=minimal')

      // then
      await response.expect('Preference-Applied', 'return=minimal')
    })

    it('calls full DESCRIBE', async () => {
      // given
      let client: StreamClient | undefined
      const app = express()
      app.use(hydraBox())
      app.use((req, res, next) => {
        client = req.labyrinth.sparql
        next()
      })
      app.use(get)

      // when
      await request(app).get('/')

      // then
      expect(client?.query.construct).to.have.been.calledWith(sinon.match(/DESCRIBE/))
    })
  })
})

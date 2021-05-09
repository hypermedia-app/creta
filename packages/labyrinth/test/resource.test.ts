import { describe, it } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import request from 'supertest'
import { hydraBox } from '@labyrinth/testing/hydra-box'
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
  })
})

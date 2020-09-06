import { describe, it } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import request from 'supertest'
import { hydraBox } from './support/hydra-box'
import { get } from '../collection'
import { auth } from '../lib/namespace'
import { ex } from './support/namespace'

describe('labyrinth/collection', () => {
  describe('get', () => {
    it('returns 403 when collection is restricted', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup: hydra => {
          hydra.operation.addOut(auth.required, true)
        },
      }))
      app.use(get)

      // when
      const { status } = await request(app).get('/')

      // then
      expect(status).to.eq(403)
    })

    it('sets canonical link header', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup: hydra => {
          hydra.resource.term = ex.people
        },
      }))
      app.use(get)

      // when
      const { links } = await request(app).get('/')

      // then
      expect(links).to.have.property('canonical', 'http://example.com/people')
    })
  })
})

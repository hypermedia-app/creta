import { describe, it } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import request from 'supertest'
import { namedNode } from '@rdfjs/data-model'
import { hydraBox } from './support/hydra-box'
import { get } from '../resource'
import { auth } from '../lib/namespace'

describe('laybrinth/resource', () => {
  describe('get', () => {
    it('return 200 OK when operation not restricted', async () => {
      // given
      const app = express()
      app.use(hydraBox())
      app.use(get)

      // when
      const { status } = await request(app).get('/')

      // then
      expect(status).to.eq(200)
    })

    it('return 403 when operation is restricted and no user authenticated', async () => {
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

    it('return 200 OK when operation is restricted and user is authenticated', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup(hydra) {
          hydra.operation.addOut(auth.required, true)
        },
        user: {
          id: namedNode('john-doe'),
          permissions: [],
        },
      }))
      app.use(get)

      // when
      const { status } = await request(app).get('/')

      // then
      expect(status).to.eq(200)
    })

    it('return 403 OK when operation is restricted and user does not have correct permissions', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup(hydra) {
          hydra.operation
            .addOut(auth.required, true)
            .addList(auth.permissions, 'admin')
            .addList(auth.permissions, ['user', 'editor'])
        },
        user: {
          id: namedNode('john-doe'),
          permissions: ['user'],
        },
      }))
      app.use(get)

      // when
      const { status } = await request(app).get('/')

      // then
      expect(status).to.eq(403)
    })

    it('return 200 OK when operation is restricted and user does have correct permissions', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup(hydra) {
          hydra.operation
            .addOut(auth.required, true)
            .addList(auth.permissions, 'admin')
            .addList(auth.permissions, ['user', 'editor'])
        },
        user: {
          id: namedNode('john-doe'),
          permissions: ['admin'],
        },
      }))
      app.use(get)

      // when
      const { status } = await request(app).get('/')

      // then
      expect(status).to.eq(200)
    })
  })
})

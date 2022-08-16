import request from 'supertest'
import express from 'express'
import sinon from 'sinon'
import { expect } from 'chai'
import * as redirect from '../redirect'

describe('@hydrofoil/creta-labs/redirect', () => {
  let app: express.Express

  beforeEach(() => {
    app = express()
  })

  describe('webPage', () => {
    function prefixPath(path: string) {
      return `/app${path}`
    }

    it('does a 303 redirect when HTML is requested', async () => {
      // given
      app.use(await redirect.webPage({} as any, {
        rewrite: prefixPath,
      }))

      // when
      const response = request(app)
        .get('/foo/bar')
        .accept('text/html')

      // then
      await response.expect(303).expect('Location', '/app/foo/bar')
    })

    it('calls next middleware when request is not HTML', async () => {
      // given
      app.use(await redirect.webPage({} as any, {
        rewrite: prefixPath,
      }))
      app.use((req, res) => res.send('representation'))

      // when
      const response = request(app)
        .get('/foo/bar')
        .accept('application/ld+json')

      // then
      await response.expect(200).expect('representation')
    })

    it('does a redirect with configured status', async () => {
      // given
      app.use(await redirect.webPage({} as any, {
        rewrite: prefixPath,
        status: 302,
      }))

      // when
      const response = request(app)
        .get('/foo/bar')
        .accept('text/html')

      // then
      await response.expect(302)
    })

    it('calls rewrite with correct parameters', async () => {
      // given
      const rewrite = sinon.stub()
        .returns('/app/foo/bar')
      app.use(await redirect.webPage({} as any, {
        rewrite,
      }))

      // when
      await request(app)
        .get('/foo/bar')
        .accept('text/html')

      // then
      await expect(rewrite).to.have.been.calledOnceWith('/foo/bar', sinon.match.object)
    })

    it('supports async rewrite function', async () => {
      // given
      app.use(await redirect.webPage({} as any, {
        rewrite: async (arg) => prefixPath(arg),
      }))

      // when
      const response = request(app)
        .get('/foo/bar')
        .accept('text/html')

      // then
      await response.expect(303).expect('Location', '/app/foo/bar')
    })

    it('returns 500 when redirect would cause loop', async () => {
      // given
      app.use(await redirect.webPage({} as any, {
        rewrite: (arg) => arg,
      }))

      // when
      const response = request(app)
        .get('/foo/bar')
        .accept('text/html')

      // then
      await response.expect(500)
    })
  })
})

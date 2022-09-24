import { DatasetCore } from 'rdf-js'
import sinon from 'sinon'
import { expect } from 'chai'
import type * as express from 'express'
import requestMock from 'express-request-mock'
import $rdf from 'rdf-ext'
import { Headers, preconditions, setHeaders } from '../cache'

describe('@hydrofoil/creta-labs/cache', () => {
  let stateAsync: sinon.SinonStub
  const context = {} as any

  beforeEach(() => {
    stateAsync = sinon.stub()
  })

  describe('preconditions', () => {
    it('return 304 when etag matched', async () => {
      // given
      stateAsync.resolves({
        etag: 'foo',
      })

      // when
      const { res } = await requestMock(
        await preconditions(context, { stateAsync }),
        { headers: { 'if-none-match': 'foo' } },
      )

      // then
      expect(res.statusCode).to.eq(304)
    })

    it('returns problem document when precondition fails', async () => {
      // given
      stateAsync.resolves({
        etag: 'baz',
      })

      // when
      await requestMock(
        await preconditions(context, { stateAsync }),
        { headers: { 'if-match': 'bar' } },
      ).catch(reason => {
        expect(reason.status).to.eq(412)
      })
    })
  })

  describe('setHeaders', () => {
    interface TestHandler {
      dataset: DatasetCore
      options: Headers
    }

    const testHandler = ({ dataset, options }: TestHandler): express.RequestHandler => (req, res) => {
      setHeaders({ req, res, dataset }, options)
      res.sendStatus(200)
    }

    it('does not set any header by default', async () => {
      // when
      const { res } = await requestMock(testHandler({ dataset: $rdf.dataset(), options: {} }))

      // then
      expect(res.hasHeader('cache-control')).to.be.false
      expect(res.hasHeader('etag')).to.be.false
    })

    it('sets cache-control header', async () => {
      // given
      const options: Headers = {
        'cache-control': 'no-cache',
      }

      // when
      const { res } = await requestMock(testHandler({ dataset: $rdf.dataset(), options }))

      // then
      expect(res.get('cache-control')).to.eq('no-cache')
    })

    it('sets weak etag', async () => {
      // given
      const options: Headers = {
        etag: true,
      }

      // when
      const { res } = await requestMock(testHandler({ dataset: $rdf.dataset(), options }))

      // then
      expect(res.get('etag')).to.match(/^W\/".+"$/)
    })

    it('sets weak strong etag when request negotiates minimal representation', async () => {
      // given
      const options: Headers = {
        etag: true,
      }

      // when
      const { res } = await requestMock(
        testHandler({ dataset: $rdf.dataset(), options }),
        { headers: { prefer: 'return=minimal' } },
      )

      // then
      expect(res.get('etag')).to.match(/^".+"$/)
    })
  })
})

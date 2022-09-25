import sinon from 'sinon'
import { expect } from 'chai'
import type * as express from 'express'
import requestMock from 'express-request-mock'
import { StateProvider } from 'express-preconditions'
import $rdf from 'rdf-ext'
import { Response } from 'node-fetch'
import { fetchHead } from '../../lib/cache'

describe('@hydrofoil/creta-labs/lib/cache', () => {
  let fetch: sinon.SinonStub
  let stateAsync: StateProvider
  let testMiddleware: express.RequestHandler

  beforeEach(() => {
    fetch = sinon.stub().resolves(new Response())
    stateAsync = fetchHead(fetch as any)
    testMiddleware = async (req, res) => {
      res.send(await stateAsync(req))
    }
  })

  describe('fetchHead', () => {
    it('forwards authorization header', async () => {
      // given
      const req = {
        hydra: { term: $rdf.namedNode('http://example.com/foo') },
        headers: {
          authorization: 'Basic foobar',
        },
      }

      // when
      await requestMock(testMiddleware, req)

      // then
      expect(fetch).to.have.been.calledOnceWith('http://example.com/foo', sinon.match({
        headers: {
          Authorization: 'Basic foobar',
        },
      }))
    })

    it('forwards accept header', async () => {
      // given
      const req = {
        hydra: { term: $rdf.namedNode('http://example.com/foo') },
        headers: {
          accept: 'text/turtle',
        },
      }

      // when
      await requestMock(testMiddleware, req)

      // then
      expect(fetch).to.have.been.calledOnceWith('http://example.com/foo', sinon.match({
        headers: {
          Accept: 'text/turtle',
        },
      }))
    })

    it('set "Prefer: return=minimal" when requesting with "if-match"', async () => {
      // given
      const req = {
        hydra: { term: $rdf.namedNode('http://example.com/foo') },
        headers: {
          'if-match': 'foo',
        },
      }

      // when
      await requestMock(testMiddleware, req)

      // then
      expect(fetch).to.have.been.calledOnceWith('http://example.com/foo', sinon.match({
        headers: {
          Prefer: 'return=minimal',
        },
      }))
    })

    it('does not set "Prefer: return=minimal" when requesting with "if-none-match"', async () => {
      // given
      const req = {
        hydra: { term: $rdf.namedNode('http://example.com/foo') },
        headers: {
          'if-none-match': 'foo',
        },
      }

      // when
      await requestMock(testMiddleware, req)

      // then
      expect(fetch).to.have.been.calledOnceWith('http://example.com/foo', sinon.match({
        headers: sinon.match(headers => !headers.Prefer),
      }))
    })
  })
})

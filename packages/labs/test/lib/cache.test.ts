import sinon from 'sinon'
import { expect } from 'chai'
import { StateProvider } from 'express-preconditions'
import $rdf from 'rdf-ext'
import { Response } from 'node-fetch'
import { fetchHead } from '../../lib/cache'

describe('@hydrofoil/creta-labs/lib/cache', () => {
  let fetch: sinon.SinonStub
  let stateAsync: StateProvider
  let response: Response

  beforeEach(() => {
    fetch = sinon.stub().callsFake(async () => response)
    stateAsync = fetchHead(fetch as any)
  })

  describe('fetchHead', () => {
    it('forwards authorization header', async () => {
      // given
      response = new Response('', {
        headers: {
        },
      })
      const req = {
        hydra: { term: $rdf.namedNode('http://example.com/foo') },
        headers: {
          authorization: 'Basic foobar',
        },
      }

      // when
      await stateAsync(req as any)

      // then
      expect(fetch).to.have.been.calledOnceWith('http://example.com/foo', sinon.match({
        headers: {
          Authorization: 'Basic foobar',
        },
      }))
    })

    it('forwards accept header', async () => {
      // given
      response = new Response('', {
        headers: {
        },
      })
      const req = {
        hydra: { term: $rdf.namedNode('http://example.com/foo') },
        headers: {
          accept: 'text/turtle',
        },
      }

      // when
      await stateAsync(req as any)

      // then
      expect(fetch).to.have.been.calledOnceWith('http://example.com/foo', sinon.match({
        headers: {
          Accept: 'text/turtle',
        },
      }))
    })

    it('set "Prefer: return=minimal" when requesting with "if-match"', async () => {
      // given
      response = new Response('', {
        headers: {
          'if-match': 'foo',
        },
      })
      const req = {
        hydra: { term: $rdf.namedNode('http://example.com/foo') },
        headers: {
          accept: 'text/turtle',
        },
      }

      // when
      await stateAsync(req as any)

      // then
      expect(fetch).to.have.been.calledOnceWith('http://example.com/foo', sinon.match({
        headers: {
          Accept: 'text/turtle',
          Prefer: 'return=minimal',
        },
      }))
    })
  })
})

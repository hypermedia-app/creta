import { describe, it } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import request from 'supertest'
import { handler as hydraBox } from '@labyrinth/testing/hydra-box'
import { StreamClient } from 'sparql-http-client/StreamClient'
import sinon from 'sinon'
import TermSet from '@rdfjs/term-set'
import { rdf } from '@tpluscode/rdf-ns-builders/strict'
import clownface from 'clownface'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import { knossosMock } from '@labyrinth/testing/knossos'
import { ex } from '../../testing/namespace'
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

    it('calls hooks on response representation', async () => {
      // given
      const representationHook = sinon.spy()
      const app = express()
      app.use(hydraBox({
        setup: async api => {
          api.resource.types = new TermSet([ex.Person])
          api.resource.term = ex.movies;
          (await api.resource.clownface())
            .addOut(rdf.type, ex.Person)
          clownface(api.api)
            .namedNode(ex.Person)
            .addOut(knossos.preprocessResponse, null)
        },
      }))
      knossosMock(app)
      app.use((req, res, next) => {
        req.loadCode = sinon.stub().resolves(representationHook)
        next()
      })
      app.use(get)

      // when
      await request(app).get('/movies')

      // then
      expect(representationHook).to.have.been.calledWithMatch(
        sinon.match.any,
        sinon.match(pointer => {
          return pointer.term.equals(ex.movies)
        }),
      )
    })
  })
})

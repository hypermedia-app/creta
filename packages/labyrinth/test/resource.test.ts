import { describe, it } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import request from 'supertest'
import { handler as hydraBox } from '@labyrinth/testing/hydra-box'
import sinon from 'sinon'
import TermSet from '@rdfjs/term-set'
import { rdf } from '@tpluscode/rdf-ns-builders'
import clownface from 'clownface'
import { knossos, code } from '@hydrofoil/vocabularies/builders/strict'
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
            .addOut(knossos.preprocessResponse, hook => {
              hook.addOut(code.implementedBy, null)
            })
        },
      }))
      knossosMock(app)
      app.use((req, res, next) => {
        (req.hydra.api.loaderRegistry.load as sinon.SinonStub).resolves(representationHook)
        next()
      })
      app.use(get)

      // when
      await request(app).get('/movies')

      // then
      expect(representationHook).to.have.been.calledWithMatch({
        pointer: sinon.match(pointer => {
          return pointer.term.equals(ex.movies)
        }),
      })
    })

    it('calls before send hooks', async () => {
      // given
      const beforeSendHook = sinon.spy()
      const app = express()
      app.use(hydraBox({
        setup: async api => {
          api.operation.addOut(knossos.beforeSend, bs => {
            bs.addOut(code.implementedBy, null)
          })
        },
      }))
      knossosMock(app)
      app.use((req, res, next) => {
        (req.hydra.api.loaderRegistry.load as sinon.SinonStub).resolves(beforeSendHook)
        next()
      })
      app.use(get)

      // when
      await request(app).get('/movies')

      // then
      expect(beforeSendHook).to.have.been.called
    })
  })
})

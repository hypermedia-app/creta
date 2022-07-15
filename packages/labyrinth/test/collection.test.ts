import { Term } from 'rdf-js'
import { expect } from 'chai'
import express from 'express'
import request from 'supertest'
import $rdf from 'rdf-ext'
import DatasetExt from 'rdf-ext/lib/Dataset'
import clownface, { AnyContext, AnyPointer } from 'clownface'
import sinon from 'sinon'
import { rdf } from '@tpluscode/rdf-ns-builders'
import { handler as hydraBox } from '@labyrinth/testing/hydra-box'
import { ex } from '@labyrinth/testing/namespace'
import { knossos, code } from '@hydrofoil/vocabularies/builders/strict'
import TermSet from '@rdfjs/term-set'
import { knossosMock } from '@labyrinth/testing/knossos'
import { createGetHandler } from '../collection'

describe('@hydrofoil/labyrinth/collection', () => {
  let members: Term[]
  let memberData: AnyPointer<AnyContext, DatasetExt>

  beforeEach(() => {
    members = [ex.Foo, ex.Bar, ex.Baz]
    memberData = clownface({ dataset: $rdf.dataset() })
    memberData.node(members).addOut(rdf.type, ex.Person)
  })

  async function initQueries() {
    return {
      queries: {
        members: () => members,
        memberData: async () => memberData.dataset.toStream(),
        total: () => members.length,
      },
    }
  }

  describe('get', () => {
    it('sets canonical link header', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup: hydra => {
          hydra.resource.term = ex.people
        },
      }))
      app.use(createGetHandler({
        initQueries,
      }))

      // when
      const response = request(app).get('/')

      // then
      // eslint-disable-next-line prefer-regex-literals
      await response.expect('link', new RegExp('<http://example.com/people>; rel="canonical"'))
    })

    it('calls hooks on response representation', async () => {
      // given
      const representationHook = sinon.spy()
      const app = express()
      app.use(hydraBox({
        setup: async api => {
          api.resource.types = new TermSet([ex.Collection])
          api.resource.term = ex.movies;
          (await api.resource.clownface())
            .addOut(rdf.type, ex.Collection)
          clownface(api.api)
            .namedNode(ex.Collection)
            .addOut(knossos.preprocessResponse, hook => hook.addOut(code.implementedBy, null))
        },
      }))
      knossosMock(app)
      app.use((req, res, next) => {
        (req.hydra.api.loaderRegistry.load as sinon.SinonStub).resolves(representationHook)
        next()
      })
      app.use(createGetHandler({
        initQueries,
      }))

      // when
      await request(app).get('/movies')

      // then
      expect(representationHook).to.have.been.calledWithMatch({
        pointer: sinon.match(pointer => {
          return pointer.term.equals(ex.movies)
        }),
      })
    })
  })
})

import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import request from 'supertest'
import $rdf from 'rdf-ext'
import clownface from 'clownface'
import sinon, { SinonStub, SinonStubbedInstance } from 'sinon'
import { rdf } from '@tpluscode/rdf-ns-builders/strict'
import RdfResource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import { hydraBox } from '@labyrinth/testing/hydra-box'
import { ex } from '@labyrinth/testing/namespace'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import TermSet from '@rdfjs/term-set'
import { get } from '../collection'
import * as collectionQuery from '../lib/query/collection'

RdfResource.factory.addMixin(...Object.values(Hydra))

describe('@hydrofoil/labyrinth/collection', () => {
  let collectionQueryMock: SinonStubbedInstance<typeof collectionQuery>
  let memberData: SinonStub
  let members: SinonStub
  let totals: SinonStub

  beforeEach(() => {
    collectionQueryMock = sinon.stub(collectionQuery)
    members = sinon.stub().resolves([])
    totals = sinon.stub().resolves(0)
    memberData = sinon.stub().resolves($rdf.dataset().toStream())

    collectionQueryMock.getSparqlQuery.resolves({
      members,
      memberData,
      totals,
    })
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('get', () => {
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

    it('calls hooks on response representation', async () => {
      // given
      const representationHook = sinon.spy()
      const app = express()
      collectionQueryMock.getSparqlQuery.resolves(null)
      app.use(hydraBox({
        setup: async api => {
          api.resource.types = new TermSet([ex.Collection])
          api.resource.term = ex.movies;
          (await api.resource.clownface())
            .addOut(rdf.type, ex.Collection)
          clownface(api.api)
            .namedNode(ex.Collection)
            .addOut(knossos.preprocessResponse, null)
        },
      }))
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

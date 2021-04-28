import express from 'express'
import request from 'supertest'
import { hydraBox } from '@labyrinth/testing/hydra-box'
import clownface, { GraphPointer } from 'clownface'
import { foaf, hydra, rdf, schema } from '@tpluscode/rdf-ns-builders'
import { ex } from '@labyrinth/testing/namespace'
import { KnossosMock, knossosMock } from '@labyrinth/testing/knossos'
import { turtle } from '@tpluscode/rdf-string'
import { eventMocks } from '@labyrinth/testing/events'
import { namedNode } from '@labyrinth/testing/nodeFactory'
import { expect } from 'chai'
import sinon from 'sinon'
import httpStatus from 'http-status'
import { CreateMember } from '../collection'
import * as ns from '../lib/namespace'

describe('@hydrofoil/knossos/collection', () => {
  let app: express.Express
  let knossos: KnossosMock

  beforeEach(() => {
    app = express()
    knossos = knossosMock(app)
    app.use(hydraBox())
    app.use(eventMocks)
    app.use(async (req, res, next) => {
      const collection = await req.hydra.resource.clownface()

      collection.addOut(rdf.type, ex.Collection)
      collection.addOut(hydra.manages, manages => {
        manages.addOut(hydra.property, rdf.type)
        manages.addOut(hydra.object, schema.Person)
      })

      knossos.store.load.callsFake(async term => namedNode(term.value))

      next()
    })
  })

  describe('CreateMember', () => {
    const setClassMemberTemplate: express.RequestHandler = function (req, res, next) {
      clownface(req.hydra.api)
        .node(ex.Collection)
        .addOut(ns.knossos.memberTemplate, template => {
          template.addOut(hydra.template, '/foo/{name}')
            .addOut(hydra.mapping, mapping => {
              mapping.addOut(hydra.variable, 'name')
              mapping.addOut(hydra.property, schema.name)
              mapping.addOut(hydra.required, true)
            })
        })

      next()
    }

    beforeEach(() => {
      app.use(setClassMemberTemplate)
    })

    it('returns 201', async () => {
      // given
      app.post('/collection', CreateMember)

      // when
      const response = request(app)
        .post('/collection')
        .send(turtle`<> ${schema.name} "john" .`.toString())
        .set('content-type', 'text/turtle')

      // then
      await response.expect(httpStatus.CREATED)
    })

    it('return 409 is resource already exists', async () => {
      // given
      app.post('/collection', CreateMember)
      knossos.store.exists.resolves(true)

      // when
      const response = request(app)
        .post('/collection')
        .send(turtle`<> ${schema.name} "john" .`.toString())
        .set('content-type', 'text/turtle')

      // then
      await response.expect(httpStatus.CONFLICT)
    })

    it('creates identifier from template', async () => {
      // given
      app.post('/collection', CreateMember)

      // when
      await request(app)
        .post('/collection')
        .send(turtle`<> ${schema.name} "john" .`.toString())
        .set('content-type', 'text/turtle')
        .set('host', 'example.com')

      // then
      expect(knossos.store.save).to.have.been.calledWith(sinon.match({
        term: ex('foo/john'),
      }))
    })

    it('adds all member assertions', async () => {
      // given
      app.use(async (req, res, next) => {
        const collection = await req.hydra.resource.clownface()
        collection.addOut(hydra.memberAssertion, assert => {
          assert.addOut(hydra.property, rdf.type)
          assert.addOut(hydra.object, foaf.Person)
        })
        next()
      })
      app.post('/collection', CreateMember)

      // when
      await request(app)
        .post('/collection')
        .send(turtle`<> ${schema.name} "john" .`.toString())
        .set('content-type', 'text/turtle')
        .set('host', 'example.com')

      // then
      expect(knossos.store.save).to.have.been.calledWith(sinon.match((value: GraphPointer) => {
        expect(value.out(rdf.type).terms).to.deep.contain.members([
          schema.Person,
          foaf.Person,
        ])
        return true
      }))
    })
  })
})

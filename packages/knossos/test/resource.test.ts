import express from 'express'
import { client } from '@labyrinth/testing/client'
import * as wac from 'rdf-web-access-control'
import sinon from 'sinon'
import request from 'supertest'
import { turtle } from '@tpluscode/rdf-string'
import { as, foaf, hydra, schema } from '@tpluscode/rdf-ns-builders'
import httpStatus from 'http-status'
import { hydraBox } from '@labyrinth/testing/hydra-box'
import { KnossosMock, knossosMock } from '@labyrinth/testing/knossos'
import clownface from 'clownface'
import { expect } from 'chai'
import { namedNode } from '@labyrinth/testing/nodeFactory'
import { create } from '../resource'
import * as ns from '../lib/namespace'
import * as shacl from '../shacl'

describe('@hydrofoil/knossos/resource', () => {
  let app: express.Express
  let knossos: KnossosMock
  const check = sinon.stub(wac, 'check')
  const validate = sinon.stub(shacl, 'shaclValidate')

  beforeEach(() => {
    check.resolves(true)
    validate.callsFake((req, res, next) => next())

    app = express()
    knossos = knossosMock(app)
    app.use(hydraBox())

    knossos.store.load.callsFake(async (term: any) => namedNode(term))
  })

  after(() => {
    check.restore()
    validate.restore()
  })

  describe('create', () => {
    it('returns 403 if ACL check fails', async () => {
      // given
      check.resolves(false)
      app.use((req, res, next) => {
        clownface(req.hydra.api)
          .addOut(hydra.supportedClass, schema.Person, Person => {
            Person.addOut(ns.knossos.createWithPUT, true)
          })
        next()
      })
      app.use(create(client))

      // when
      const response = request(app)
        .put('/foo')
        .send(turtle`<> a ${schema.Person} .`.toString())
        .set('Content-Type', 'text/turtle')

      // then
      await response.expect(httpStatus.FORBIDDEN)
    })

    it('returns 405 if class does not allow PUT to create', async () => {
      // given
      app.use(create(client))

      // when
      const response = request(app)
        .put('/foo')
        .send(turtle`<> a ${schema.Person} .`.toString())
        .set('Content-Type', 'text/turtle')

      // then
      await response.expect(httpStatus.METHOD_NOT_ALLOWED)
    })

    it('returns 405 if any class forbids PUT to create', async () => {
      // given
      app.use((req, res, next) => {
        clownface(req.hydra.api)
          .addOut(hydra.supportedClass, schema.Person, Person => {
            Person.addOut(ns.knossos.createWithPUT, true)
          })
          .addOut(hydra.supportedClass, foaf.Person, Person => {
            Person.addOut(ns.knossos.createWithPUT, false)
          })
        next()
      })
      app.use(create(client))

      // when
      const response = request(app)
        .put('/foo')
        .send(turtle`<> a ${schema.Person}, ${foaf.Person} .`.toString())
        .set('Content-Type', 'text/turtle')

      // then
      await response.expect(httpStatus.METHOD_NOT_ALLOWED)
    })

    it('returns 409 if resource already exists', async () => {
      // given
      app.use((req, res, next) => {
        clownface(req.hydra.api)
          .addOut(hydra.supportedClass, schema.Person, Person => {
            Person.addOut(ns.knossos.createWithPUT, true)
          })
        next()
      })
      knossos.store.exists.resolves(true)
      app.use(create(client))

      // when
      const response = request(app)
        .put('/foo')
        .send(turtle`<> a ${schema.Person} .`.toString())
        .set('Content-Type', 'text/turtle')

      // then
      await response.expect(httpStatus.CONFLICT)
    })

    describe('on successful request', () => {
      let response: request.Test

      beforeEach(async () => {
        // given
        knossos.store.exists.resolves(false)
        app.use((req, res, next) => {
          clownface(req.hydra.api)
            .addOut(hydra.supportedClass, schema.Person, Person => {
              Person.addOut(ns.knossos.createWithPUT, true)
            })
          next()
        })
        app.use(create(client))

        // when
        response = request(app)
          .put('/foo')
          .send(turtle`<> a ${schema.Person} .`.toString())
          .set('Content-Type', 'text/turtle')
      })

      it('returns 201', async () => {
        await response.expect(httpStatus.CREATED)
      })

      it('saves resource', async () => {
        await response

        expect(knossos.store.save).to.have.been.called
      })

      it('sets location header', async () => {
        await response.expect('Location', /foo$/)
      })

      it('emits as:Create event', async () => {
        await response

        expect(knossos.events).to.have.been.calledWith(sinon.match({
          types: [as.Create],
        }))
      })

      it('handles immediate events', async () => {
        await response

        expect(knossos.events.handleImmediate).to.have.been.called
      })
    })
  })
})

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
import httpError from 'http-errors'
import * as ns from '@hydrofoil/vocabularies/builders/strict'
import * as resource from '../resource'
import * as shacl from '../shacl'

const setBeforeHooks: express.RequestHandler = (req, res, next) => {
  const graph = clownface(req.hydra.api)
  graph.node(schema.Person)
    .addOut(ns.knossos.beforeSave, graph.blankNode('beforePerson'))
  graph.node(foaf.Agent)
    .addOut(ns.knossos.beforeSave, graph.blankNode('beforeAgent'))
  next()
}

describe('@hydrofoil/knossos/resource', () => {
  let app: express.Express
  let knossos: KnossosMock
  let check: sinon.SinonStub<any, Promise<boolean>>

  beforeEach(() => {
    check = sinon.stub(wac, 'check').resolves(true)
    sinon.stub(shacl, 'shaclValidate').callsFake(() => (req, res, next) => next())

    app = express()
    knossos = knossosMock(app)
    app.use(hydraBox())

    knossos.store.load.callsFake(async (term: any) => namedNode(term))
  })

  afterEach(() => {
    sinon.restore()
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
      app.use(resource.create(client))

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
      app.use(resource.create(client))

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
      app.use(resource.create(client))

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
      app.use(resource.create(client))

      // when
      const response = request(app)
        .put('/foo')
        .send(turtle`<> a ${schema.Person} .`.toString())
        .set('Content-Type', 'text/turtle')

      // then
      await response.expect(httpStatus.CONFLICT)
    })

    it('runs before hooks from all types', async () => {
      // given
      const agentHook = sinon.spy()
      const personHook = sinon.spy()
      app.use((req, res, next) => {
        req.loadCode = sinon.stub()
          .onFirstCall().resolves(personHook)
          .onSecondCall().resolves(agentHook)
        next()
      })
      app.use((req, res, next) => {
        clownface(req.hydra.api)
          .addOut(hydra.supportedClass, schema.Person, Person => {
            Person.addOut(ns.knossos.createWithPUT, true)
          })
        next()
      })
      app.use(setBeforeHooks)
      knossos.store.exists.resolves(false)
      app.use(resource.create(client))

      // when
      await request(app)
        .put('/foo')
        .send(turtle`<> a ${schema.Person}, ${foaf.Agent} .`.toString())
        .set('Content-Type', 'text/turtle')

      // then
      expect(agentHook).to.have.been.called
      expect(personHook).to.have.been.called
    })

    it('ignores before hooks which fail to load', async () => {
      // given
      const personHook = sinon.spy()
      app.use((req, res, next) => {
        req.loadCode = sinon.stub()
          .onFirstCall().resolves(personHook)
          .onSecondCall().resolves(null)
        next()
      })
      app.use((req, res, next) => {
        clownface(req.hydra.api)
          .addOut(hydra.supportedClass, schema.Person, Person => {
            Person.addOut(ns.knossos.createWithPUT, true)
          })
        next()
      })
      app.use(setBeforeHooks)
      knossos.store.exists.resolves(false)
      app.use(resource.create(client))

      // when
      await request(app)
        .put('/foo')
        .send(turtle`<> a ${schema.Person}, ${foaf.Agent} .`.toString())
        .set('Content-Type', 'text/turtle')

      // then
      expect(personHook).to.have.been.called
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
        app.use(resource.create(client))

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

  describe('PUT', () => {
    describe('on successful request', () => {
      let response: request.Test

      beforeEach(async () => {
        // given
        app.use(resource.PUT)

        // when
        response = request(app)
          .put('/foo')
          .send(turtle`<> a ${schema.Person} .`.toString())
          .set('Content-Type', 'text/turtle')
      })

      it('emits as:Update event', async () => {
        await response

        expect(knossos.events).to.have.been.calledWith(sinon.match({
          types: [as.Update],
        }))
      })

      it('handles immediate events', async () => {
        await response

        expect(knossos.events.handleImmediate).to.have.been.called
      })

      it('returns 200', async () => {
        await response.expect(httpStatus.OK)
      })
    })

    it('runs before hooks from all types', async () => {
      // given
      const agentHook = sinon.spy()
      const personHook = sinon.spy()
      app.use((req, res, next) => {
        req.loadCode = sinon.stub()
          .onFirstCall().resolves(personHook)
          .onSecondCall().resolves(agentHook)
        next()
      })
      app.use(setBeforeHooks)
      app.use(resource.PUT)

      // when
      await request(app)
        .put('/foo')
        .send(turtle`<> a ${schema.Person}, ${foaf.Agent} .`.toString())
        .set('Content-Type', 'text/turtle')

      // then
      expect(agentHook).to.have.been.called
      expect(personHook).to.have.been.called
    })

    it('ignores before hooks which fail to load', async () => {
      // given
      const personHook = sinon.spy()
      app.use((req, res, next) => {
        req.loadCode = sinon.stub()
          .onFirstCall().resolves(personHook)
          .onSecondCall().resolves(null)
        next()
      })
      app.use(setBeforeHooks)
      app.use(resource.PUT)

      // when
      await request(app)
        .put('/foo')
        .send(turtle`<> a ${schema.Person}, ${foaf.Agent} .`.toString())
        .set('Content-Type', 'text/turtle')

      // then
      expect(personHook).to.have.been.called
    })

    it('responds error when hook throws', async () => {
      // given
      const personHook = sinon.stub().callsFake(() => {
        throw new httpError.Conflict()
      })
      app.use((req, res, next) => {
        req.loadCode = sinon.stub().resolves(personHook)
        next()
      })
      app.use(setBeforeHooks)
      app.use(resource.PUT)

      // when
      const response = request(app)
        .put('/foo')
        .send(turtle`<> a ${schema.Person}, ${foaf.Agent} .`.toString())
        .set('Content-Type', 'text/turtle')

      // then
      await response.expect(httpStatus.CONFLICT)
    })
  })
})

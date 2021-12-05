import { Term } from 'rdf-js'
import express, { Router } from 'express'
import request from 'supertest'
import { hydraBox } from '@labyrinth/testing/hydra-box'
import clownface, { GraphPointer } from 'clownface'
import { foaf, hydra, rdf, rdfs, schema } from '@tpluscode/rdf-ns-builders'
import { ex } from '@labyrinth/testing/namespace'
import { KnossosMock, knossosMock } from '@labyrinth/testing/knossos'
import { turtle } from '@tpluscode/rdf-string'
import { eventMocks } from '@labyrinth/testing/events'
import { namedNode } from '@labyrinth/testing/nodeFactory'
import { expect } from 'chai'
import sinon from 'sinon'
import httpStatus from 'http-status'
import * as ns from '@hydrofoil/vocabularies/builders'
import $rdf from 'rdf-ext'
import * as describeResource from '@hydrofoil/labyrinth/lib/query/describeResource'
import { CreateMember } from '../collection'

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

      sinon.stub(describeResource, 'describeResource')
        .resolves(namedNode(ex.Foo).addOut(rdf.type, schema.Person).dataset.toStream())

      next()
    })
  })

  afterEach(() => {
    sinon.restore()
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

    it('creates identifier from instance template', async () => {
      // given
      app.use(async function setInstanceTemplate(req, res, next) {
        const collection = await req.hydra.resource.clownface()
        collection
          .addOut(ns.knossos.memberTemplate, template => {
            template.addOut(hydra.template, '/bar/{name}')
              .addOut(hydra.mapping, mapping => {
                mapping.addOut(hydra.variable, 'name')
                mapping.addOut(hydra.property, schema.name)
                mapping.addOut(hydra.required, true)
              })
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
      expect(knossos.store.save).to.have.been.calledWith(sinon.match({
        term: ex('bar/john'),
      }))
    })

    it('includes base path in created identifier', async () => {
      // given
      const route = Router()
      route.post('/collection', CreateMember)
      app.use('/base-path', route)

      // when
      await request(app)
        .post('/base-path/collection')
        .send(turtle`<> ${schema.name} "john" .`.toString())
        .set('content-type', 'text/turtle')
        .set('host', 'example.com')

      // then
      expect(knossos.store.save).to.have.been.calledWith(sinon.match({
        term: ex('base-path/foo/john'),
      }))
    })

    it('creates identifier from template with transforms', async () => {
      // given
      let loadCode!: sinon.SinonStub
      app.use((req, res, next) => {
        clownface(req.hydra.api)
          .node(ex.Collection)
          .out(ns.knossos.memberTemplate)
          .out(hydra.mapping)
          .addOut(ns.knossos.transformVariable)

        ;({ loadCode } = req as any)
        loadCode.resolves((term: Term) => $rdf.literal(`${term.value}-and-jane`))

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
        expect(value.term).to.deep.eq(ex('foo/john-and-jane'))
        expect(value.out(schema.name).value).to.eq('john')
        return true
      }))
      expect(loadCode).to.have.been.calledWith(sinon.match.any, sinon.match({
        basePath: sinon.match.string,
      }))
    })

    it('throws when transform fails to load transforms', async () => {
      // given
      app.use((req, res, next) => {
        clownface(req.hydra.api)
          .node(ex.Collection)
          .out(ns.knossos.memberTemplate)
          .out(hydra.mapping)
          .addOut(ns.knossos.transformVariable)

        ;(req.hydra.api.loaderRegistry.load as sinon.SinonStub).resolves(null)

        next()
      })
      app.post('/collection', CreateMember)

      // when
      const response = request(app)
        .post('/collection')
        .send(turtle`<> ${schema.name} "john" .`.toString())
        .set('content-type', 'text/turtle')
        .set('host', 'example.com')

      // then
      await response.expect(500)
    })

    it('throws when a member template variable is missing', async () => {
      // given
      app.post('/collection', CreateMember)

      // when
      const response = request(app)
        .post('/collection')
        .send(turtle`<> ${rdfs.label} "john" .`.toString())
        .set('content-type', 'text/turtle')
        .set('host', 'example.com')

      // then
      await response.expect(400)
    })

    it('adds property/object member assertions', async () => {
      // given
      app.use(async (req, res, next) => {
        const collection = await req.hydra.resource.clownface()
        collection.addOut(hydra.memberAssertion, assert => {
          assert.addOut(hydra.property, rdf.type)
          assert.addOut(hydra.object, foaf.Person)
        })
        collection.addOut(hydra.memberAssertion, assert => {
          assert.addOut(hydra.property, foaf.knows)
          assert.addOut(hydra.object, ex.Jane)
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
        expect(value.out(foaf.knows).terms).to.deep.contain.members([
          ex.Jane,
        ])
        return true
      }))
    })

    it('does not add member assertions other than property/object', async () => {
      // given
      app.use(async (req, res, next) => {
        const collection = await req.hydra.resource.clownface()
        collection.addOut(hydra.memberAssertion, assert => {
          assert.addOut(hydra.property, rdf.type)
          assert.addOut(hydra.object, foaf.Person)
        })
        collection.addOut(hydra.memberAssertion, assert => {
          assert.addOut(hydra.property, foaf.knows)
          assert.addOut(hydra.subject, ex.Jane)
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
        return value.any().has(foaf.knows).terms.length === 0
      }))
    })
  })
})

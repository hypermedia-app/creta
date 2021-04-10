import express from 'express'
import request from 'supertest'
import { hydraBox } from '@labyrinth/testing/hydra-box'
import clownface from 'clownface'
import { hydra, rdf, schema } from '@tpluscode/rdf-ns-builders'
import { ex } from '@labyrinth/testing/namespace'
import { KnossosMock, knossosMock } from '@labyrinth/testing/knossos'
import { turtle } from '@tpluscode/rdf-string'
import { eventMocks } from '@labyrinth/testing/events'
import { namedNode } from '@labyrinth/testing/nodeFactory'
import { expect } from 'chai'
import sinon from 'sinon'
import httpStatus from 'http-status'
import { POST } from '../collection'
import * as ns from '../lib/namespace'

describe('@hydrofoil/knossos', () => {
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
        manages.addOut(hydra.object, ex.Instance)
      })

      knossos.store.load.callsFake(async term => namedNode(term.value))

      next()
    })
  })

  describe('collection', () => {
    describe('POST', () => {
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

      const templateSetups: [string, express.RequestHandler][] = [
        ['member template declared on class', setClassMemberTemplate],
      ]

      for (const [title, setup] of templateSetups) {
        describe(title, () => {
          beforeEach(() => {
            app.use(setup)
            app.post('/collection', POST)
          })

          it('returns 201', async () => {
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
            knossos.store.exists.resolves(true)

            // when
            const response = request(app)
              .post('/collection')
              .send(turtle`<> ${schema.name} "john" .`.toString())
              .set('content-type', 'text/turtle')

            // then
            await response.expect(httpStatus.CONFLICT)
          })

          it('saves created resource to store', async () => {
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
        })
      }
    })
  })
})

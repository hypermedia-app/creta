import { describe, beforeEach, it } from 'mocha'
import request from 'supertest'
import express, { Express, Router } from 'express'
import { expect } from 'chai'
import type { Knossos } from '@hydrofoil/knossos/server'
import sinon from 'sinon'
import { as } from '@tpluscode/rdf-ns-builders'
import { knossosMock } from '@labyrinth/testing/knossos'
import { blankNode } from '@labyrinth/testing/nodeFactory'
import { hyper_events } from '@hydrofoil/vocabularies/builders'
import { knossosEvents } from '../index'
import * as lib from '../lib/loadHandlers'

describe('@hydrofoil/express-events', () => {
  let app: Express
  let knossos: Knossos

  beforeEach(() => {
    app = express()

    knossos = knossosMock(app)
    app.use(knossosEvents({
      path: '__event',
    }))
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('req.events', () => {
    describe('emit', () => {
      it('save an event with correct identifier', async () => {
        // given
        app.use('/my/app', Router().get('*', (req, res) => {
          res.event({
            types: [as.Create],
          })

          res.end()
        }))

        // when
        await request(app)
          .get('/my/app/foo')
          .set('host', 'example.com')

        // then
        expect(knossos.store.save).to.have.been.calledWith(sinon.match({
          term: {
            termType: 'NamedNode',
            value: sinon.match(/^http:\/\/example.com\/my\/app\/__event\/.+$/),
          },
        }))
      })

      it('runs handlers when request ends', async () => {
        // given
        const handler = sinon.spy()
        const loadHandlers = sinon.stub(lib, 'loadHandlers')
        loadHandlers.resolves([{
          handler: blankNode(),
          impl: handler,
        }])

        app.use('/my/app', Router().get('*', async (req, res) => {
          res.event({
            types: [as.Create],
          })

          res.end()
        }))

        // when
        await request(app)
          .get('/my/app/foo')
          .set('host', 'example.com')

        // then
        expect(handler).to.have.been.calledOnce
      })
    })

    describe('handleImmediate', () => {
      it('runs handlers before request ends', async () => {
        // given
        const immediateHandler = sinon.spy()
        const otherHandler = sinon.spy()
        const loadHandlers = sinon.stub(lib, 'loadHandlers')
        loadHandlers.resolves([{
          handler: blankNode().addOut(hyper_events.immediate, true),
          impl: immediateHandler,
        }, {
          handler: blankNode(),
          impl: otherHandler,
        }])

        app.use('/my/app', Router().get('*', async (req, res, next) => {
          res.event({
            types: [as.Create],
          })

          await res.event.handleImmediate()

          next()
        }))
        app.use((req, res) => {
          res.send({
            immediateCalled: immediateHandler.called,
            otherCalled: otherHandler.called,
          })
        })

        // when
        const response = request(app)
          .get('/my/app/foo')
          .set('host', 'example.com')

        // then
        await response.expect({
          immediateCalled: true,
          otherCalled: false,
        })
      })

      it('only runs an immediate handler once', async () => {
        // given
        const immediateHandler = sinon.spy()
        const loadHandlers = sinon.stub(lib, 'loadHandlers')
        loadHandlers.resolves([{
          handler: blankNode().addOut(hyper_events.immediate, true),
          impl: immediateHandler,
        }])

        app.use('/my/app', Router().get('*', async (req, res) => {
          res.event({
            types: [as.Create],
          })

          await res.event.handleImmediate()

          res.sendStatus(200)
        }))

        // when
        await request(app)
          .get('/my/app/foo')
          .set('host', 'example.com')

        // then
        expect(immediateHandler).to.have.been.calledOnce
      })

      it('called multiple times, runs handlers only once', async () => {
        // given
        const immediateHandler = sinon.spy()
        const loadHandlers = sinon.stub(lib, 'loadHandlers')
        loadHandlers.resolves([{
          handler: blankNode().addOut(hyper_events.immediate, true),
          impl: immediateHandler,
        }])

        app.use('/my/app', Router().get('*', async (req, res, next) => {
          res.event({
            types: [as.Create],
          })

          res.event.handleImmediate()
          await res.event.handleImmediate()

          next()
        }))
        app.use((req, res) => {
          res.send({
            immediateCalled: immediateHandler.callCount,
          })
        })

        // when
        const response = request(app)
          .get('/my/app/foo')
          .set('host', 'example.com')

        // then
        await response.expect({
          immediateCalled: 1,
        })
      })

      it('does not prevent multiple handlers, some of which are not immediate', async () => {
        // given
        const otherHandler = sinon.spy()
        const loadHandlers = sinon.stub(lib, 'loadHandlers')
        loadHandlers.resolves([{
          handler: blankNode().addOut(hyper_events.immediate, true),
          impl: sinon.spy(),
        }, {
          handler: blankNode(),
          impl: otherHandler,
        }])

        app.use('/my/app', Router().get('*', async (req, res) => {
          res.event({
            types: [as.Create],
          })

          res.event.handleImmediate()
          await res.event.handleImmediate()

          res.end()
        }))

        // when
        await request(app)
          .get('/my/app/foo')
          .set('host', 'example.com')

        // then
        expect(otherHandler).to.have.been.called
      })
    })
  })
})

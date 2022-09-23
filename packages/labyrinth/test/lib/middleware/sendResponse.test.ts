import { beforeEach, describe } from 'mocha'
import express from 'express'
import sinon from 'sinon'
import { handler as hydraBox } from '@labyrinth/testing/hydra-box'
import request from 'supertest'
import { expect } from 'chai'
import { code, knossos } from '@hydrofoil/vocabularies/builders'
import $rdf from 'rdf-ext'
import { knossosMock } from '@labyrinth/testing/knossos'
import { sendResponse } from '../../../lib/middleware'

describe('@hydrofoil/labyrinth/lib/middleware/sendResponse', () => {
  let app: express.Express
  let beforeSendHook: sinon.SinonSpy
  let respondDataset: sinon.SinonStub

  beforeEach(() => {
    beforeSendHook = sinon.spy()
    respondDataset = sinon.stub()
    app = express()
    app.use(hydraBox())
    app.use((req, res, next) => {
      (req.hydra.api.loaderRegistry.load as sinon.SinonStub).onFirstCall().resolves(beforeSendHook)
      next()
    })
    app.use(function fauxResponse(req, res, next) {
      respondDataset.callsFake(() => res.sendStatus(204))
      res.dataset = respondDataset
      next()
    })
    knossosMock(app)
  })

  it('calls hook defined on operation', async () => {
    // given
    const dataset = $rdf.dataset()
    app
      .use((req, res, next) => {
        req.hydra.operation.addOut(knossos.beforeSend, hook => {
          hook.addOut(code.implementedBy, null)
        })
        next()
      })
      .use(sendResponse(dataset))

    // when
    await request(app).get('/')

    // then
    expect(beforeSendHook).to.have.been.calledWith(
      {
        req: sinon.match.object,
        res: sinon.match.object,
        dataset,
      },
    )
    expect(respondDataset).to.have.been.calledWith(dataset)
  })

  it('calls hook with named args', async () => {
    // given
    const dataset = $rdf.dataset()
    app
      .use((req, res, next) => {
        req.hydra.operation.addOut(knossos.beforeSend, hook => {
          hook.addOut(code.implementedBy, null)
            .addOut(code.arguments, arg => {
              arg.addOut(code.name, 'foo')
              arg.addOut(code.value, 'bar')
            })
        })
        next()
      })
      .use(sendResponse(dataset))

    // when
    await request(app).get('/')

    // then
    expect(beforeSendHook).to.have.been.calledWith(
      {
        req: sinon.match.object,
        res: sinon.match.object,
        dataset,
      }, { foo: 'bar' },
    )
    expect(respondDataset).to.have.been.calledWith(dataset)
  })

  it('calls hook with positional args', async () => {
    // given
    const dataset = $rdf.dataset()
    app
      .use((req, res, next) => {
        req.hydra.operation.addOut(knossos.beforeSend, hook => {
          hook.addOut(code.implementedBy, null)
            .addList(code.arguments, ['foo', 'bar'])
        })
        next()
      })
      .use(sendResponse(dataset))

    // when
    await request(app).get('/')

    // then
    expect(beforeSendHook).to.have.been.calledWith(
      {
        req: sinon.match.object,
        res: sinon.match.object,
        dataset,
      },
      'foo',
      'bar',
    )
    expect(respondDataset).to.have.been.calledWith(dataset)
  })

  it('calls all hooks defined on operation', async () => {
    // given
    const dataset = $rdf.dataset()
    app
      .use((req, res, next) => {
        (req.hydra.api.loaderRegistry.load as sinon.SinonStub).resolves(beforeSendHook)
        next()
      })
      .use((req, res, next) => {
        req.hydra.operation.addOut(knossos.beforeSend, hook => {
          hook.addOut(code.implementedBy, null)
        })
        req.hydra.operation.addOut(knossos.beforeSend, hook => {
          hook.addOut(code.implementedBy, null)
        })
        req.hydra.operation.addOut(knossos.beforeSend, hook => {
          hook.addOut(code.implementedBy, null)
        })
        next()
      })
      .use(sendResponse(dataset))

    // when
    await request(app).get('/')

    // then
    expect(beforeSendHook).to.have.been.calledThrice
  })
})

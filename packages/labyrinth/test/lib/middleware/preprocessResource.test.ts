import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import cf from 'clownface'
import sinon from 'sinon'
import * as ns from '@tpluscode/rdf-ns-builders'
import { literal } from '@rdfjs/data-model'
import request from 'supertest'
import { hydraBox } from '@labyrinth/testing/hydra-box'
import { ex } from '@labyrinth/testing/namespace'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import { preprocessMiddleware } from '../../../lib/middleware/preprocessResource'

describe('@hydrofoil/labyrinth/lib/middleware/preprocessResource', () => {
  let preprocessHook: sinon.SinonSpy
  let app: express.Express

  beforeEach(() => {
    preprocessHook = sinon.spy()
    app = express()
    app.use(hydraBox({
      setup: async hydra => {
        cf(hydra.api)
          .addOut(ns.hydra.supportedClass, ex.Person, clas => {
            clas.addOut(knossos.preprocessResource, literal('loads and call enrichment function', ex.TestEnrichment))
          })
      },
    }))
    app.use((req, res, next) => {
      req.loadCode = sinon.stub().resolves(preprocessHook)
      next()
    })
  })

  it('loads and calls enrichment function', async () => {
    // given
    app.use(preprocessMiddleware({
      getTypes() {
        return [ex.Person]
      },
      getResource: req => req.hydra.resource.clownface(),
      predicate: knossos.preprocessResource,
    }))

    // when
    await request(app).get('/')

    // then
    expect(preprocessHook).to.have.been.called
  })

  it('does not call resource getter if no hooks are found', async () => {
    // given
    const getResource = sinon.spy()
    app.use(preprocessMiddleware({
      getTypes() {
        return []
      },
      getResource,
      predicate: knossos.preprocessResource,
    }))

    // when
    await request(app).get('/')

    // then
    expect(preprocessHook).not.to.have.been.called
    expect(getResource).not.to.have.been.called
  })

  it('does not call hook if no resource is loaded', async () => {
    // given
    app.use(preprocessMiddleware({
      getTypes() {
        return [ex.Person]
      },
      getResource() {
        return undefined
      },
      predicate: knossos.preprocessResource,
    }))

    // when
    await request(app).get('/')

    // then
    expect(preprocessHook).not.to.have.been.called
  })
})

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
import { hyper_query } from '@hydrofoil/vocabularies/builders/strict'
import { preprocessResource } from '../../../lib/middleware/preprocessResource'

describe('labyrinth/lib/middleware/preprocessResource', () => {
  let enrichmentSpy: sinon.SinonSpy

  beforeEach(() => {
    enrichmentSpy = sinon.spy()
  })

  it('loads and calls enrichment function', async () => {
    // given
    const app = express()
    app.use(hydraBox({
      setup: async hydra => {
        (await hydra.resource.clownface())
          .addOut(ns.rdf.type, [ex.Person])
        cf(hydra.api)
          .addOut(ns.hydra.supportedClass, ex.Person, clas => {
            clas.addOut(hyper_query.preprocess, literal('loads and call enrichment function', ex.TestEnrichment))
          })
      },
    }))
    app.use((req, res, next) => {
      req.loadCode = sinon.stub().resolves(enrichmentSpy)
      next()
    })
    app.use(preprocessResource())

    // when
    await request(app).get('/')

    // then
    // eslint-disable-next-line no-unused-expressions
    expect(enrichmentSpy).to.have.been.called
  })
})

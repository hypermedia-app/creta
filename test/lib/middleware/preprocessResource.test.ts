import { describe, it, beforeEach, before } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import cf from 'clownface'
import * as sinon from 'sinon'
import * as ns from '@tpluscode/rdf-ns-builders'
import { literal } from '@rdfjs/data-model'
import request from 'supertest'
import { hydraBox } from '../../support/hydra-box'
import { ex } from '../../support/namespace'
import { query } from '../../../lib/namespace'
import { preprocessResource } from '../../../lib/middleware/preprocessResource'
import { loaders } from '../../../lib/rdfLoaders'

describe('labyrinth/lib/middleware/preprocessResource', () => {
  let enrichmentSpy: sinon.SinonSpy

  before(() => {
    loaders.registerLiteralLoader(ex.TestEnrichment, () => enrichmentSpy)
  })

  beforeEach(() => {
    enrichmentSpy = sinon.spy()
  })

  it('loads and calls enrichment function', async () => {
    // given
    const app = express()
    app.use(hydraBox({
      setup: async hydra => {
        (await hydra.resource.pointer())
          .addOut(ns.rdf.type, [ex.Person])
        cf(hydra.api)
          .addOut(ns.hydra.supportedClass, ex.Person, clas => {
            clas.addOut(query.preprocess, literal('loads and call enrichment function', ex.TestEnrichment))
          })
      },
    }))
    app.use(preprocessResource(__dirname))

    // when
    await request(app).get('/')

    // then
    // eslint-disable-next-line no-unused-expressions
    expect(enrichmentSpy).to.have.been.called
  })
})

import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import request from 'supertest'
import $rdf from 'rdf-ext'
import cf from 'clownface'
import sinon, { SinonStubbedInstance } from 'sinon'
import { hydraBox } from './support/hydra-box'
import { get } from '../collection'
import { auth, query } from '../lib/namespace'
import { ex } from './support/namespace'
import * as collectionQuery from '../lib/query/collection'
import * as ns from '../lib/namespace'
import { hydra, rdf, schema } from '@tpluscode/rdf-ns-builders'
import RdfResource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import { parsers } from '@rdfjs/formats-common'
import toStream from 'string-to-stream'

RdfResource.factory.addMixin(...Object.values(Hydra))

describe('labyrinth/collection', () => {
  let collectionQueryMock: SinonStubbedInstance<typeof collectionQuery>

  beforeEach(() => {
    collectionQueryMock = sinon.stub(collectionQuery)
    collectionQueryMock.getSparqlQuery.resolves({
      members: {
        execute: sinon.stub().resolves($rdf.dataset().toStream()),
      },
      totals: {
        execute: sinon.stub().resolves([]),
      },
    } as any)
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('get', () => {
    it('returns 403 when collection is restricted', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup: hydra => {
          hydra.operation.addOut(auth.required, true)
        },
      }))
      app.use(get)

      // when
      const response = request(app).get('/')

      // then
      await response.expect(403)
    })

    it('sets canonical link header', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup: hydra => {
          hydra.resource.term = ex.people
        },
      }))
      app.use(get)

      // when
      const { links } = await request(app).get('/')

      // then
      expect(links).to.have.property('canonical', 'http://example.com/people')
    })

    it('does not add view when there is no page variable', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup: api => {
          api.resource.term = ex.people
          api.operation.addOut(ns.hydraBox.variables, template => {
            template.addOut(rdf.type, hydra.IriTemplate)
            template.addOut(hydra.template, '/{?title}')
            template.addOut(hydra.mapping, mapping => {
              mapping.addOut(rdf.type, hydra.IriTemplateMapping)
              mapping.addOut(hydra.property, schema.title)
              mapping.addOut(hydra.variable, 'title')
            })
          })
        },
      }))
      app.use(get)

      // when
      const res = await request(app).get('/')

      // then
      const dataset = await $rdf.dataset().import(parsers.import('application/ld+json', toStream(res.text))!)
      const views = cf({ dataset })
        .has(hydra.view)
        .values

      expect(views).to.have.length(0)
    })

    it('adds mapped template values to collection', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup: api => {
          api.resource.term = ex.people
          api.operation.addOut(ns.hydraBox.variables, template => {
            template.addOut(rdf.type, hydra.IriTemplate)
            template.addOut(hydra.template, '/{?title}')
            template.addOut(hydra.mapping, mapping => {
              mapping.addOut(rdf.type, hydra.IriTemplateMapping)
              mapping.addOut(hydra.property, schema.title)
              mapping.addOut(hydra.variable, 'title')
            })
          })
        },
        query: cf({ dataset: $rdf.dataset() }).blankNode().addOut(schema.title, 'Titanic'),
      }))
      app.use(get)

      // when
      const res = await request(app).get('/')

      // then
      const dataset = await $rdf.dataset().import(parsers.import('application/ld+json', toStream(res.text))!)
      const title = cf({ dataset })
        .out(query.templateMappings)
        .out(schema.title)
        .value

      expect(title).to.eq('Titanic')
    })

    it('adds pages links', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup: api => {
          api.resource.term = ex.people
          api.operation.addOut(ns.hydraBox.variables, template => {
            template.addOut(rdf.type, hydra.IriTemplate)
            template.addOut(hydra.template, '/{?title,page}')
            template.addOut(hydra.mapping, mapping => {
              mapping.addOut(rdf.type, hydra.IriTemplateMapping)
              mapping.addOut(hydra.property, schema.title)
              mapping.addOut(hydra.variable, 'title')
            })
            template.addOut(hydra.mapping, mapping => {
              mapping.addOut(rdf.type, hydra.IriTemplateMapping)
              mapping.addOut(hydra.property, hydra.pageIndex)
              mapping.addOut(hydra.variable, 'page')
            })
          })
        },
        query: cf({ dataset: $rdf.dataset() }).blankNode()
          .addOut(hydra.pageIndex, 50)
          .addOut(schema.title, 'Titanic'),
      }))
      collectionQueryMock.getSparqlQuery.resolves({
        members: {
          execute: sinon.stub().resolves($rdf.dataset().toStream()),
        },
        totals: {
          execute: sinon.stub().resolves([{
            count: { value: 1000 },
          }]),
        },
      } as any)
      app.use(get)

      // when
      const res = await request(app).get('/')

      // then
      const dataset = await $rdf.dataset().import(parsers.import('application/ld+json', toStream(res.text))!)
      const view = cf({ dataset }).out(hydra.view)

      expect(view.out(hydra.first).value).to.eq('?title=Titanic')
      expect(view.out(hydra.previous).value).to.eq('?title=Titanic&page=49')
      expect(view.out(hydra.next).value).to.eq('?title=Titanic&page=51')
      expect(view.out(hydra.last).value).to.eq('?title=Titanic&page=84')
    })
  })
})

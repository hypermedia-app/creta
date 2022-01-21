import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import request from 'supertest'
import $rdf from 'rdf-ext'
import clownface from 'clownface'
import sinon, { SinonStub, SinonStubbedInstance } from 'sinon'
import { hydra, rdf, rdfs, schema, xsd } from '@tpluscode/rdf-ns-builders/strict'
import RdfResource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import { parsers } from '@rdfjs/formats-common'
import toStream from 'into-stream'
import { hydraBox } from '@labyrinth/testing/hydra-box'
import * as ns from '@hydrofoil/vocabularies/builders/strict'
import { ex } from '@labyrinth/testing/namespace'
import { fromPointer } from '@rdfine/hydra/lib/IriTemplate'
import { fromPointer as mapping } from '@rdfine/hydra/lib/IriTemplateMapping'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import TermSet from '@rdfjs/term-set'
import { get } from '../collection'
import * as collectionQuery from '../lib/query/collection'

RdfResource.factory.addMixin(...Object.values(Hydra))

describe('@hydrofoil/labyrinth/collection', () => {
  let collectionQueryMock: SinonStubbedInstance<typeof collectionQuery>
  let memberData: SinonStub
  let members: SinonStub
  let totals: SinonStub

  beforeEach(() => {
    collectionQueryMock = sinon.stub(collectionQuery)
    members = sinon.stub().resolves([])
    totals = sinon.stub().resolves(0)
    memberData = sinon.stub().resolves($rdf.dataset().toStream())

    collectionQueryMock.getSparqlQuery.resolves({
      members,
      memberData,
      totals,
    })
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('get', () => {
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
      const views = clownface({ dataset })
        .has(hydra.view)
        .values

      expect(views).to.have.length(0)
    })

    it('adds mapped template values to collection', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup: async api => {
          api.resource.term = ex.people;
          (await api.resource.clownface()).addOut(hydra.search, template => {
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
      const res = await request(app)
        .get('/')
        .query({
          title: 'Titanic',
        })

      // then
      const dataset = await $rdf.dataset().import(parsers.import('application/ld+json', toStream(res.text))!)
      const title = clownface({ dataset })
        .out(ns.hyper_query.templateMappings)
        .out(schema.title)
        .value

      expect(title).to.eq('Titanic')
    })

    describe('paged collection', () => {
      let app: express.Express

      beforeEach(() => {
        app = express()
        app.use(hydraBox({
          setup: async api => {
            api.resource.term = ex.people
            ;(await api.resource.clownface()).addOut(hydra.search, template => {
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
        }))
        totals.resolves(1000)
        app.use(get)
      })

      it('adds pages links', async () => {
        // when
        const res = await request(app)
          .get('/')
          .query({
            title: 'Titanic',
            page: '50',
          })

        // then
        const dataset = await $rdf.dataset().import(parsers.import('application/ld+json', toStream(res.text))!)
        const view = clownface({ dataset }).out(hydra.view)

        expect(view.term).to.deep.eq($rdf.namedNode('?title=Titanic&page=50'))
        expect(view.out(hydra.first).value).to.eq('?title=Titanic')
        expect(view.out(hydra.previous).value).to.eq('?title=Titanic&page=49')
        expect(view.out(hydra.next).value).to.eq('?title=Titanic&page=51')
        expect(view.out(hydra.last).value).to.eq('?title=Titanic&page=84')
      })

      it('adds correct last page link when last page is exactly full', async () => {
        // given
        // 10 equal pages of 12 members
        totals.resolves(120)

        // when
        const res = await request(app)
          .get('/')
          .query({
            title: 'Titanic',
          })

        // then
        const dataset = await $rdf.dataset().import(parsers.import('application/ld+json', toStream(res.text))!)
        const view = clownface({ dataset }).out(hydra.view)

        expect(view.out(hydra.last).value).to.eq('?title=Titanic&page=10')
      })

      it('adds pages links to first page', async () => {
        // when
        const res = await request(app)
          .get('/')
          .query({
            title: 'Titanic',
          })

        // then
        const dataset = await $rdf.dataset().import(parsers.import('application/ld+json', toStream(res.text))!)
        const view = clownface({ dataset }).out(hydra.view)

        expect(view.term).to.deep.eq($rdf.namedNode('?title=Titanic'))
        expect(view.out(hydra.first).value).to.eq('?title=Titanic')
        expect(view.out(hydra.previous).value).to.be.undefined
        expect(view.out(hydra.next).value).to.eq('?title=Titanic&page=2')
        expect(view.out(hydra.last).value).to.eq('?title=Titanic&page=84')
      })

      it('adds pages links to last page', async () => {
        // when
        const res = await request(app)
          .get('/')
          .query({
            title: 'Titanic',
            page: '84',
          })

        // then
        const dataset = await $rdf.dataset().import(parsers.import('application/ld+json', toStream(res.text))!)
        const view = clownface({ dataset }).out(hydra.view)

        expect(view.term).to.deep.eq($rdf.namedNode('?title=Titanic&page=84'))
        expect(view.out(hydra.first).value).to.eq('?title=Titanic')
        expect(view.out(hydra.next).value).to.be.undefined
        expect(view.out(hydra.last).value).to.eq('?title=Titanic&page=84')
      })
    })

    it('passes pageSize to create query function', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup: api => {
          api.resource.term = ex.people
        },
      }))
      app.use((req, res, next) => {
        req.labyrinth.collection.pageSize = 25
        next()
      })
      app.use(get)

      // when
      await request(app).get('/')

      // then
      expect(collectionQueryMock.getSparqlQuery).to.have.been.calledOnceWith(sinon.match({
        pageSize: 25,
      }))
    })

    it('passes collection-type-defined page size to create query function', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup: hydraBox => {
          hydraBox.resource.types.add(ex.Collection)
          clownface(hydraBox.api).namedNode(ex.Collection)
            .addOut(hydra.limit, 15)
        },
      }))
      app.use((req, res, next) => {
        req.labyrinth.collection.pageSize = 25
        next()
      })
      app.use(get)

      // when
      await request(app).get('/')

      // then
      expect(collectionQueryMock.getSparqlQuery).to.have.been.calledOnceWith(sinon.match({
        pageSize: 15,
      }))
    })

    it('passes page size from query string', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup: async hydraBox => {
          hydraBox.resource.types.add(ex.Collection)
          ;(await hydraBox.resource.clownface()).addOut(hydra.search, template => {
            fromPointer(template, {
              template: '?pageSize',
              mapping: mapping(template.blankNode(), {
                variable: 'pageSize',
                property: hydra.limit,
              }),
            })
          })
        },
      }))
      app.use((req, res, next) => {
        req.labyrinth.collection.pageSize = 25
        next()
      })
      app.use(get)

      // when
      await request(app).get('/').query({
        pageSize: 10,
      })

      // then
      expect(collectionQueryMock.getSparqlQuery).to.have.been.calledOnceWith(sinon.match({
        pageSize: 10,
      }))
    })

    it('passes collection-specific page size to create query function', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup: async hydraBox => {
          hydraBox.resource.types.add(ex.Collection);
          (await hydraBox.resource.clownface())
            .addOut(hydra.limit, 10)
          clownface(hydraBox.api).namedNode(ex.Collection)
            .addOut(hydra.limit, 15)
        },
      }))
      app.use((req, res, next) => {
        req.labyrinth.collection.pageSize = 25
        next()
      })
      app.use(get)

      // when
      await request(app).get('/')

      // then
      expect(collectionQueryMock.getSparqlQuery).to.have.been.calledOnceWith(sinon.match({
        pageSize: 10,
      }))
    })

    it('returns empty collection when no query is returned', async function () {
      // given
      const app = express()
      collectionQueryMock.getSparqlQuery.resolves(null)
      app.use(hydraBox({
        setup: async api => {
          api.resource.term = ex.movies;
          (await api.resource.clownface())
            .addOut(rdf.type, ex.Collection)
          clownface(api.api)
            .namedNode(ex.Collection)
            .addOut(hydra.manages,
              m => m.addOut(hydra.property, rdf.type).addOut(hydra.object, ex.Person))
        },
      }))
      app.use(get)

      // when
      const response = await request(app).get('/movies').expect(200)

      // then
      expect(response.body).to.matchSnapshot(this)
    })

    it('returns existing hydra:members without generating a query', async () => {
      // given
      const app = express()
      collectionQueryMock.getSparqlQuery.resolves(null)
      collectionQueryMock.memberData.resolves(clownface({ dataset: $rdf.dataset() })
        .node(ex.Titanic).addOut(rdfs.label, 'Titanic')
        .node(ex.StarWars).addOut(rdfs.label, 'Star Wars')
        .dataset.toStream())
      app.use(hydraBox({
        setup: async api => {
          api.resource.term = ex.movies;
          (await api.resource.clownface())
            .addOut(rdf.type, ex.Collection)
            .addOut(hydra.member, [ex.Titanic, ex.StarWars])
            .addOut(hydra.totalItems, 4)
          clownface(api.api)
            .namedNode(ex.Collection)
        },
      }))
      app.use(get)

      // when
      const res = await request(app).get('/movies').expect(200)
      const dataset = await $rdf.dataset().import(parsers.import('application/ld+json', toStream(res.text))!)
      const collection = clownface({ dataset }).node(ex.movies)

      // then
      expect(collection.out(hydra.member).terms).to.deep.contain.members([ex.Titanic, ex.StarWars])
      expect(collection.node([ex.Titanic, ex.StarWars]).out(rdfs.label).terms).to.have.length(2)
      expect(collection.out(hydra.totalItems).term).to.deep.eq($rdf.literal('2', xsd.integer))
      expect(collectionQueryMock.getSparqlQuery).not.to.have.been.called
    })

    it('calls hooks on response representation', async () => {
      // given
      const representationHook = sinon.spy()
      const app = express()
      collectionQueryMock.getSparqlQuery.resolves(null)
      app.use(hydraBox({
        setup: async api => {
          api.resource.types = new TermSet([ex.Collection])
          api.resource.term = ex.movies;
          (await api.resource.clownface())
            .addOut(rdf.type, ex.Collection)
          clownface(api.api)
            .namedNode(ex.Collection)
            .addOut(knossos.preprocessResponse, null)
        },
      }))
      app.use((req, res, next) => {
        req.loadCode = sinon.stub().resolves(representationHook)
        next()
      })
      app.use(get)

      // when
      await request(app).get('/movies')

      // then
      expect(representationHook).to.have.been.calledWithMatch(
        sinon.match.any,
        sinon.match(pointer => {
          return pointer.term.equals(ex.movies)
        }),
      )
    })
  })
})

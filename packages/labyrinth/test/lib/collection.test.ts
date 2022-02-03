import { describe, it, beforeEach } from 'mocha'
import express from 'express'
import { hydraBox } from '@labyrinth/testing/hydra-box'
import { ex } from '@labyrinth/testing/namespace'
import { blankNode, namedNode } from '@labyrinth/testing/nodeFactory'
import { expect } from 'chai'
import { client } from '@labyrinth/testing/sparql'
import RdfResource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import { hydra, schema } from '@tpluscode/rdf-ns-builders/strict'
import $rdf from 'rdf-ext'
import { fromPointer } from '@rdfine/hydra/lib/IriTemplate'
import { hyper_query } from '@hydrofoil/vocabularies/builders/strict'
import sinon from 'sinon'
import clownface from 'clownface'
import { CollectionLocals, createViews, loadCollection, runQueries } from '../../lib/collection'

RdfResource.factory.addMixin(...Object.values(Hydra))

describe('@hydrofoil/labyrinth/lib/collection', () => {
  let req: Pick<express.Request, 'hydra' | 'labyrinth' | 'query'>

  beforeEach(async () => {
    req = {
      hydra: await hydraBox(hb => {
        hb.resource.term = ex.people
      }),
      labyrinth: {
        sparql: client(),
        collection: {
          pageSize: 5,
        },
      },
      query: {},
    }
  })

  describe('loadCollection', () => {
    it('loads collection from hydra store', async () => {
      // when
      const result = await loadCollection(req)

      // then
      expect(result.collection.term).to.deep.eq(ex.people)
    })

    it('does not load search if collection has no search template', async () => {
      // when
      const result = await loadCollection(req)

      // then
      expect(result.queryParams.out().values).to.have.length(0)
      expect(result.search).to.be.undefined
      expect(result.searchTemplate).to.be.null
    })

    it('processes search template', async () => {
      // given
      const collection = await req.hydra.resource.clownface()
      const search = fromPointer(collection.blankNode('search'), {
        mapping: [{
          variable: 'name',
          property: schema.name,
        }],
      })
      collection.addOut(hydra.search, search.id)
      req.query.name = 'john'

      // when
      const result = await loadCollection(req)

      // then
      expect(result.search?.term).to.deep.eq($rdf.blankNode('search'))
      expect(result.searchTemplate?.id).to.deep.eq($rdf.blankNode('search'))
      expect(result.queryParams?.out(schema.name).value).to.deep.eq('john')
      expect(result.collection.out(hyper_query.templateMappings).out(schema.name).value).to.deep.eq('john')
    })

    it('dereferences search if it is a URI', async () => {
      // given
      const collection = await req.hydra.resource.clownface()
      collection.addOut(hydra.search, ex.searchPeople)
      const { sparql } = req.labyrinth as any
      sparql.query.construct.resolves(
        namedNode(ex.searchPeople).addOut(hydra.mapping, null).dataset.toStream())

      // when
      const result = await loadCollection(req)

      // then
      expect(result.search?.out(hydra.mapping).terms).to.have.length.greaterThan(0)
      expect(sparql.query.construct).to.have.been.called
    })

    it('returns default pageSize if no other defined', async () => {
      // when
      const result = await loadCollection(req)

      // then
      expect(result.pageSize).to.eq(5)
    })

    it('returns collection-type-defined page size', async () => {
      // given
      req.hydra.resource.types.add(ex.Collection)
      clownface(req.hydra.api).namedNode(ex.Collection).addOut(hydra.limit, 25)

      // when
      const result = await loadCollection(req)

      // then
      expect(result.pageSize).to.eq(25)
    })

    it('returns collection-instance-defined page size', async () => {
      // given
      req.hydra.resource.types.add(ex.Collection)
      clownface(req.hydra.api).namedNode(ex.Collection).addOut(hydra.limit, 25)
      const collection = await req.hydra.resource.clownface()
      collection.addOut(hydra.limit, 30)

      // when
      const result = await loadCollection(req)

      // then
      expect(result.pageSize).to.eq(30)
    })

    it('returns page size from query string', async () => {
      // given
      req.hydra.resource.types.add(ex.Collection)
      clownface(req.hydra.api).namedNode(ex.Collection).addOut(hydra.limit, 25)
      const collection = await req.hydra.resource.clownface()
      collection.addOut(hydra.limit, 30)
      const search = fromPointer(collection.blankNode('search'), {
        mapping: [{
          variable: 'pageSize',
          property: hydra.limit,
        }],
      })
      collection.addOut(hydra.search, search.id)
      req.query.pageSize = '50'

      // when
      const result = await loadCollection(req)

      // then
      expect(result.pageSize).to.eq(50)
    })
  })

  describe('runQueries', () => {
    it('passes members to memberData query', async () => {
      // given
      const queries = {
        members: sinon.mock().resolves([ex.foo, ex.bar, ex.baz, ex.baz]),
        totals: sinon.mock().resolves(1014),
        memberData: sinon.mock(),
      }

      // when
      const result = await runQueries({ queries })

      // then
      expect(result.total).to.eq(1014)
      expect(queries.memberData).to.have.been.calledWith([ex.foo, ex.bar, ex.baz])
    })

    it('passes only URIs to memberData query', async () => {
      // given
      const queries = {
        members: sinon.mock().resolves([ex.foo, $rdf.blankNode(), $rdf.literal('foo')]),
        totals: sinon.mock(),
        memberData: sinon.mock(),
      }

      // when
      await runQueries({ queries })

      // then
      expect(queries.memberData).to.have.been.calledWith([ex.foo])
    })

    it('deduplicates member identifiers', async () => {
      // given
      const queries = {
        members: sinon.mock().resolves([ex.foo, ex.foo, ex.bar, ex.bar]),
        totals: sinon.mock(),
        memberData: sinon.mock(),
      }

      // when
      const { members } = await runQueries({ queries })

      // then
      expect(queries.memberData).to.have.been.calledWith([ex.foo, ex.bar])
      expect(members).to.deep.eq([ex.foo, ex.bar])
    })
  })

  describe('createViews', () => {
    let locals: Pick<CollectionLocals, 'searchTemplate' | 'queryParams' | 'total' | 'pageSize'>

    beforeEach(() => {
      locals = {
        total: 100,
        queryParams: blankNode(),
        pageSize: 10,
        searchTemplate: null,
      }
    })

    it('returns null when there is no template', () => {
      // when
      const view = createViews(locals)

      // then
      expect(view).to.be.null
    })

    it('returns null when template does not have a hydra:pageIndex', () => {
      // given
      locals.searchTemplate = fromPointer(blankNode())

      // when
      const view = createViews(locals)

      // then
      expect(view).to.be.null
    })

    it('calculates pages links', () => {
      // given
      locals.total = 1000
      locals.pageSize = 12
      locals.queryParams.addOut(schema.title, 'Titanic').addOut(hydra.pageIndex, 50)
      locals.searchTemplate = fromPointer(blankNode(), {
        template: '{?title,page}',
        mapping: [{
          variable: 'page',
          property: hydra.pageIndex,
        }, {
          variable: 'title',
          property: schema.title,
        }],
      })

      // when
      const view = createViews(locals)

      // then
      expect(view?.term).to.deep.eq($rdf.namedNode('?title=Titanic&page=50'))
      expect(view?.out(hydra.first).value).to.eq('?title=Titanic&page=1')
      expect(view?.out(hydra.previous).value).to.eq('?title=Titanic&page=49')
      expect(view?.out(hydra.next).value).to.eq('?title=Titanic&page=51')
      expect(view?.out(hydra.last).value).to.eq('?title=Titanic&page=84')
    })

    it('calculates correct last page link when last page is exactly full', () => {
      // given
      locals.total = 120
      locals.pageSize = 12
      locals.queryParams.addOut(schema.title, 'Titanic')
      locals.searchTemplate = fromPointer(blankNode(), {
        template: '{?title,page}',
        mapping: [{
          variable: 'page',
          property: hydra.pageIndex,
        }, {
          variable: 'title',
          property: schema.title,
        }],
      })

      // when
      const view = createViews(locals)

      // then
      expect(view?.out(hydra.last).value).to.eq('?title=Titanic&page=10')
    })

    it('adds pages links to first page', () => {
      // given
      locals.total = 1000
      locals.pageSize = 12
      locals.queryParams.addOut(schema.title, 'Titanic')
      locals.searchTemplate = fromPointer(blankNode(), {
        template: '{?title,page}',
        mapping: [{
          variable: 'page',
          property: hydra.pageIndex,
        }, {
          variable: 'title',
          property: schema.title,
        }],
      })

      // when
      const view = createViews(locals)

      // then
      expect(view?.term).to.deep.eq($rdf.namedNode('?title=Titanic&page=1'))
      expect(view?.out(hydra.first).value).to.eq('?title=Titanic&page=1')
      expect(view?.out(hydra.previous).value).to.be.undefined
      expect(view?.out(hydra.next).value).to.eq('?title=Titanic&page=2')
      expect(view?.out(hydra.last).value).to.eq('?title=Titanic&page=84')
    })

    it('adds pages links to last page', () => {
      // given
      locals.total = 1000
      locals.pageSize = 12
      locals.queryParams.addOut(schema.title, 'Titanic').addOut(hydra.pageIndex, 84)
      locals.searchTemplate = fromPointer(blankNode(), {
        template: '{?title,page}',
        mapping: [{
          variable: 'page',
          property: hydra.pageIndex,
        }, {
          variable: 'title',
          property: schema.title,
        }],
      })

      // when
      const view = createViews(locals)

      // then
      expect(view?.term).to.deep.eq($rdf.namedNode('?title=Titanic&page=84'))
      expect(view?.out(hydra.first).value).to.eq('?title=Titanic&page=1')
      expect(view?.out(hydra.next).value).to.be.undefined
      expect(view?.out(hydra.last).value).to.eq('?title=Titanic&page=84')
    })
  })
})

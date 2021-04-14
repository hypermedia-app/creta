import path from 'path'
import { describe, it } from 'mocha'
import { expect } from 'chai'
import express, { RequestHandler } from 'express'
import request from 'supertest'
import $rdf from 'rdf-ext'
import TermSet from '@rdfjs/term-set'
import { hydra } from '@tpluscode/rdf-ns-builders'
import { loader, apiFactory } from '@labyrinth/testing/hydra-box'
import { ex } from '@labyrinth/testing/namespace'
import { hydraBox } from '../index'

describe('labyrinth', () => {
  const codePath = path.resolve(__dirname, '..')

  it('returns 404 when no operation is found', async () => {
    // given
    const app = express()
    app.use(await hydraBox({
      path: '/api',
      loadApi: apiFactory(),
      codePath,
      loader: loader(),
      sparql: {
        endpointUrl: '/sparql',
        updateUrl: '/sparql',
        storeUrl: '/sparql',
      },
    }))

    // when
    const response = request(app).get('/')

    // then
    await response
      .expect(404)
  })

  it.skip('returns 401 when handler returns UnauthorizedError', async () => {
    // given
    const app = express()
    app.use(await hydraBox({
      path: '/api',
      loadApi: apiFactory(),
      codePath,
      loader: loader({
        classResource: [{
          prefetchDataset: $rdf.dataset(),
          dataset: async () => $rdf.dataset(),
          quadStream() {
            return $rdf.dataset().toStream()
          },
          term: ex(),
          types: new TermSet([ex.Authenticated, hydra.Resource]),
        }],
      }),
      sparql: {
        endpointUrl: '/sparql',
        updateUrl: '/sparql',
        storeUrl: '/sparql',
      },
    }))

    // when
    const response = request(app).get('/').set('host', 'example.com')

    // then
    await response
      .expect(401)
  })

  it.skip('returns 403 when handler returns ForbiddenError', async () => {
    // given
    const app = express()
    app.use(await hydraBox({
      path: '/api',
      loadApi: apiFactory(),
      codePath,
      loader: loader({
        classResource: [{
          prefetchDataset: $rdf.dataset(),
          dataset: async () => $rdf.dataset(),
          quadStream() {
            return $rdf.dataset().toStream()
          },
          term: ex(),
          types: new TermSet([ex.Protected]),
        }],
      }),
      sparql: {
        endpointUrl: '/sparql',
        updateUrl: '/sparql',
        storeUrl: '/sparql',
      },
    }))

    // when
    const response = request(app).get('/').set('host', 'example.com')

    // then
    await response
      .expect(403)
  })

  it('sets default page size', async () => {
    // given
    const app = express()
    app.use(await hydraBox({
      path: '/api',
      loadApi: apiFactory<RequestHandler>({
        code: (req, res) => res.send(req.labyrinth),
      }),
      codePath,
      loader: loader({
        classResource: [{
          prefetchDataset: $rdf.dataset(),
          dataset: async () => $rdf.dataset(),
          quadStream() {
            return $rdf.dataset().toStream()
          },
          term: ex(),
          types: new TermSet([ex.Config]),
        }],
      }),
      sparql: {
        endpointUrl: '/sparql',
        updateUrl: '/sparql',
        storeUrl: '/sparql',
      },
    }))

    // when
    const response = request(app).get('/').set('host', 'example.com')

    // then
    await response.expect((res) => {
      expect(res.body).to.deep.include({
        collection: { pageSize: 10 },
      })
    })
  })

  it('sets overridden page size', async () => {
    // given
    const app = express()
    app.use(await hydraBox({
      path: '/api',
      loadApi: apiFactory<RequestHandler>({
        code: (req, res) => res.send(req.labyrinth),
      }),
      codePath,
      loader: loader({
        classResource: [{
          prefetchDataset: $rdf.dataset(),
          dataset: async () => $rdf.dataset(),
          quadStream() {
            return $rdf.dataset().toStream()
          },
          term: ex(),
          types: new TermSet([ex.Config]),
        }],
      }),
      sparql: {
        endpointUrl: '/sparql',
        updateUrl: '/sparql',
        storeUrl: '/sparql',
      },
      options: {
        collection: {
          pageSize: 20,
        },
      },
    }))

    // when
    const response = request(app).get('/').set('host', 'example.com')

    // then
    await response.expect((res) => {
      expect(res.body).to.deep.include({
        collection: { pageSize: 20 },
      })
    })
  })

  it('attaches operation middleware', async () => {
    // given
    const app = express()
    app.use(await hydraBox({
      path: '/api',
      loadApi: apiFactory(),
      codePath,
      loader: loader(),
      sparql: {
        endpointUrl: '/sparql',
        updateUrl: '/sparql',
        storeUrl: '/sparql',
      },
      middleware: {
        operations: (req, res) => {
          res.send('foo')
        },
      },
    }))

    // when
    const response = request(app).get('/')

    // then
    await response
      .expect('foo')
  })

  it('attaches multiple operation middleware', async () => {
    // given
    const app = express()
    app.use(await hydraBox({
      path: '/api',
      loadApi: apiFactory(),
      codePath,
      loader: loader(),
      sparql: {
        endpointUrl: '/sparql',
        updateUrl: '/sparql',
        storeUrl: '/sparql',
      },
      middleware: {
        operations: [(req, res, next) => {
          res.locals.foo = 'bar'
          next()
        }, (req, res) => {
          res.send(res.locals.foo)
        }],
      },
    }))

    // when
    const response = request(app).get('/')

    // then
    await response
      .expect('bar')
  })

  it('attaches multiple resource middleware', async () => {
    // given
    const app = express()
    app.use(await hydraBox({
      path: '/api',
      loadApi: apiFactory(),
      codePath,
      loader: loader(),
      sparql: {
        endpointUrl: '/sparql',
        updateUrl: '/sparql',
        storeUrl: '/sparql',
      },
      middleware: {
        resource: [(req, res, next) => {
          res.locals.foo = 'bar'
          next()
        }, (req, res) => {
          res.send(res.locals.foo)
        }],
      },
    }))

    // when
    const response = request(app).get('/')

    // then
    await response
      .expect('bar')
  })
})

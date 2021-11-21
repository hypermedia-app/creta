import { expect } from 'chai'
import express from 'express'
import sinon from 'sinon'
import request from 'supertest'
import $rdf from 'rdf-ext'
import { coreMiddleware } from '../../lib/coreMiddleware'

describe('@hydrofoil/knossos/lib/coreMiddleware', () => {
  const options = {
    name: 'test-api',
    path: '/api',
    codePath: 'lib',
    apiRoots: [],
    client: {} as any,
    sparql: {} as any,
    store: {} as any,
    log: sinon.spy() as any,
  }

  let app: express.Express
  let createMockApi: sinon.SinonStub

  beforeEach(() => {
    app = express()
    createMockApi = sinon.stub<any[], Promise<express.RequestHandler>>().resolves((req, res) => res.end())
  })

  it('creates api on subpath', async () => {
    // given
    app.use(/\/(people|projects)/, coreMiddleware({
      ...options,
    }, createMockApi))

    // when
    await request(app)
      .get('/people/john-doe')
      .set('Host', 'example.com')

    // then
    expect(createMockApi).to.have.been.calledWithMatch({
      apiTerm: $rdf.namedNode('http://example.com/people/api'),
    })

    // when
    await request(app)
      .get('/projects/shaperone')
      .set('Host', 'example.com')

    // then
    expect(createMockApi).to.have.been.calledWithMatch({
      apiTerm: $rdf.namedNode('http://example.com/projects/api'),
    })
  })

  it('includes proxy prefix in API URI', async () => {
    // given
    app.use('/people', coreMiddleware({
      ...options,
    }, createMockApi))

    // when
    await request(app)
      .get('/people/john-doe')
      .set('Host', 'example.com')
      .set('X-Forwarded-Prefix', '/org-api')

    // then
    expect(createMockApi).to.have.been.calledWithMatch({
      apiTerm: $rdf.namedNode('http://example.com/org-api/people/api'),
    })
  })
})

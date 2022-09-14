import { expect } from 'chai'
import sinon from 'sinon'
import { testApi } from '@labyrinth/testing/hydra-box'
import { blankNode, namedNode } from '@labyrinth/testing/nodeFactory'
import { Debugger } from 'debug'
import $rdf from 'rdf-ext'
import { knossos, code } from '@hydrofoil/vocabularies/builders'
import { rdf, schema } from '@tpluscode/rdf-ns-builders'
import express from 'express'
import { GraphPointer } from 'clownface'
import { ResourcePerGraphStore, ResourceStore } from '../../lib/store'
import { loadAuthorizationPatterns, loadMiddlewares, loadResourceLoader, overrideLoader } from '../../lib/settings'
import { Context } from '../..'

describe('@hydrofoil/knossos/lib/settings', () => {
  const log: Debugger = sinon.spy() as any
  let context: Context
  let store: sinon.SinonStubbedInstance<ResourceStore>

  beforeEach(() => {
    store = sinon.createStubInstance(ResourcePerGraphStore)
    context = {
      apiTerm: $rdf.namedNode('/api'),
      sparql: {} as any,
      client: {} as any,
      store,
    }
  })

  describe('loadMiddlewares', () => {
    it('returns empty when not config is found', async () => {
      // when
      const result = await loadMiddlewares(
        testApi(),
        log,
        context,
        { config: undefined },
      )

      // then
      expect(result).to.deep.eq({})
    })

    it('returns empty when there are no middlewares', async () => {
      // given
      const config = namedNode('/config')

      // when
      const result = await loadMiddlewares(
        testApi(),
        log,
        context,
        { config },
      )

      // then
      expect(result).to.deep.eq({})
    })

    it('returns correctly mapped middlewares', async () => {
      // given
      const config = namedNode('/config')
        .addOut(knossos.middleware, middleware => {
          middleware
            .addOut(schema.name, 'before')
            .addOut(code.implementedBy, impl => {
              impl
                .addOut(rdf.type, code.EcmaScript)
                .addOut(code.link, $rdf.namedNode('node:cors'))
            })
        })
        .addOut(knossos.middleware, middleware => {
          middleware
            .addOut(schema.name, 'before')
            .addOut(code.implementedBy, impl => {
              impl
                .addOut(rdf.type, code.EcmaScript)
                .addOut(code.link, $rdf.namedNode('node:cors'))
            })
        })
        .addOut(knossos.middleware, middleware => {
          middleware
            .addOut(schema.name, 'after')
            .addOut(code.implementedBy, impl => {
              impl
                .addOut(rdf.type, code.EcmaScript)
                .addOut(code.link, $rdf.namedNode('node:cors'))
            })
        })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      function middleware() {}
      const api = testApi()
      ;(api.loaderRegistry.load as sinon.SinonStub).resolves(() => middleware)

      // when
      const result = await loadMiddlewares(
        api,
        log,
        context,
        { config },
      )

      // then
      expect(result).to.deep.eq({
        before: [middleware, middleware],
        after: [middleware],
      })
    })

    it('throws when middleware fails to load', async () => {
      // given
      const config = namedNode('/config')
        .addOut(knossos.middleware, middleware => {
          middleware
            .addOut(schema.name, 'before')
            .addOut(code.implementedBy, impl => {
              impl
                .addOut(rdf.type, code.EcmaScript)
                .addOut(code.link, $rdf.namedNode('foo:bar'))
            })
        })
      const api = testApi()
      ;(api.loaderRegistry.load as sinon.SinonStub).onFirstCall().resolves(null)

      // when
      const result = loadMiddlewares(
        api,
        log,
        context,
        { config },
      )

      // then
      await expect(result).to.be.eventually.rejectedWith(/Failed to load/)
    })

    it('throws when middleware has no implementation', async () => {
      // given
      const config = namedNode('/config')
        .addOut(knossos.middleware, middleware => {
          middleware.addOut(schema.name, 'before')
        })

      // when
      const result = loadMiddlewares(
        testApi(),
        log,
        context,
        { config },
      )

      // then
      await expect(result).to.be.eventually.rejectedWith(/Missing code:implementedBy/)
    })
  })

  describe('loadAuthorizationPatterns', () => {
    it('returns empty when not config is found', async () => {
      // when
      const result = await loadAuthorizationPatterns(
        testApi(),
        log,
        { config: undefined },
      )

      // then
      expect(result).to.be.empty
    })

    it('returns loaded auths', async () => {
      // given
      const config = namedNode('/config')
        .addOut(knossos.authorizationRule, auth => {
          auth
            .addOut(schema.name, 'after')
            .addOut(code.implementedBy, impl => {
              impl
                .addOut(rdf.type, code.EcmaScript)
                .addOut(code.link, $rdf.namedNode('foo:bar'))
            })
        })
      const authRule = () => ({})
      const api = testApi()
      ;(api.loaderRegistry.load as sinon.SinonStub).onFirstCall().resolves(authRule)

      // when
      const result = await loadAuthorizationPatterns(
        api,
        log,
        { config },
      )

      // then
      expect(result).to.deep.eq([authRule])
    })

    it('throws when authorization fails to load', async () => {
      // given
      const config = namedNode('/config')
        .addOut(knossos.authorizationRule, auth => {
          auth
            .addOut(schema.name, 'after')
            .addOut(code.implementedBy, impl => {
              impl
                .addOut(rdf.type, code.EcmaScript)
                .addOut(code.link, $rdf.namedNode('foo:bar'))
            })
        })
      const api = testApi()
      ;(api.loaderRegistry.load as sinon.SinonStub).onFirstCall().resolves(null)

      // when
      const result = loadAuthorizationPatterns(
        api,
        log,
        { config },
      )

      // then
      await expect(result).to.be.eventually.rejectedWith(/Failed to load .+/)
    })
  })

  describe('loadResourceLoader', () => {
    it('returns undefined when no loader is configured', async () => {
      // given
      const config = namedNode('/config')

      // when
      const loaded = await loadResourceLoader(
        testApi(),
        log,
        context,
        { config },
      )

      // then
      expect(loaded).to.be.undefined
    })

    it('throws when no loader factory fails to load', async () => {
      // given
      const config = namedNode('/config')
      config.addOut(knossos.resourceLoader, loader => {
        loader.addOut(code.implementedBy, impl => impl.addOut(code.link, config.blankNode()))
      })
      const api = testApi()
      ;(api.loaderRegistry.load as sinon.SinonStub).onFirstCall().resolves(null)

      // when
      const promise = loadResourceLoader(
        api,
        log,
        context,
        { config },
      )

      // then
      await expect(promise).to.be.eventually.rejected
    })

    it('calls factory, returns created loader', async () => {
      // given
      const config = namedNode('/config')
      config.addOut(knossos.resourceLoader, loader => {
        loader.addOut(code.implementedBy, impl => impl.addOut(code.link, config.blankNode()))
      })
      const loader = {}
      const factory = sinon.stub().resolves(loader)
      const api = testApi()
      ;(api.loaderRegistry.load as sinon.SinonStub).onFirstCall().resolves(factory)

      // when
      const loaded = await loadResourceLoader(
        api,
        log,
        context,
        { config },
      )

      // then
      expect(loaded).to.eq(loader)
      expect(factory).to.have.been.calledWith(context)
    })
  })

  describe('overrideLoader', () => {
    let req: express.Request
    let res: express.Response
    let next: express.NextFunction
    let loader: sinon.SinonStub
    let config: GraphPointer

    beforeEach(() => {
      config = blankNode()
      loader = sinon.stub()
      req = {
        loadCode: loader,
        knossos: { config },
      } as any
      res = {
        locals: {},
      } as any
      next = sinon.spy()
    })

    it('loads code from knossos:override and sets to locals', async () => {
      // given
      const term = $rdf.namedNode('test-override')
      const name = 'localName'
      function func() { return '' }
      loader.resolves(func)
      config.addOut(knossos.override, override => {
        override
          .addOut(schema.identifier, term)
          .addOut(code.implementedBy, config.namedNode('impl'))
      })

      // when
      await overrideLoader({ term, name })(req, res, next)

      // then
      expect(req.loadCode).to.have.been.calledWith(
        sinon.match(ptr => ptr.term.equals(config.namedNode('impl').term)),
      )
      expect(res.locals.localName).to.eq(func)
      expect(next).to.have.been.called
    })

    it('does nothing when local is already set', async () => {
      // given
      const term = $rdf.namedNode('test-override')
      const name = 'localName'
      function func() { return '' }
      res.locals.localName = func
      config.addOut(knossos.override, override => {
        override
          .addOut(schema.identifier, term)
          .addOut(code.implementedBy, config.namedNode('impl'))
      })

      // when
      await overrideLoader({ term, name })(req, res, next)

      // then
      expect(req.loadCode).not.to.have.been.called
      expect(res.locals.localName).to.eq(func)
      expect(next).to.have.been.called
    })

    it('does nothing when implementation is not found', async () => {
      // given
      const term = $rdf.namedNode('test-override')
      const name = 'localName'
      function func() { return '' }
      res.locals.localName = func
      config.addOut(knossos.override, override => {
        override
          .addOut(schema.identifier, term)
      })

      // when
      await overrideLoader({ term, name })(req, res, next)

      // then
      expect(req.loadCode).not.to.have.been.called
      expect(res.locals.localName).to.eq(func)
      expect(next).to.have.been.called
    })

    it('does nothing when override is not found', async () => {
      // given
      const term = $rdf.namedNode('test-override')
      const name = 'localName'
      function func() { return '' }
      res.locals.localName = func

      // when
      await overrideLoader({ term, name })(req, res, next)

      // then
      expect(req.loadCode).not.to.have.been.called
      expect(res.locals.localName).to.eq(func)
      expect(next).to.have.been.called
    })
  })
})

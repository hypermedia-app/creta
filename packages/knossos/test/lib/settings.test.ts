import { expect } from 'chai'
import sinon from 'sinon'
import { testApi } from '@labyrinth/testing/hydra-box'
import { namedNode } from '@labyrinth/testing/nodeFactory'
import { Debugger } from 'debug'
import $rdf from 'rdf-ext'
import { knossos, code } from '@hydrofoil/vocabularies/builders'
import { rdf, schema } from '@tpluscode/rdf-ns-builders'
import { ResourcePerGraphStore, ResourceStore } from '../../lib/store'
import { loadAuthorizationPatterns, loadMiddlewares, loadResourceLoader } from '../../lib/settings'
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

      // when
      const result = await loadMiddlewares(
        testApi({
          code: () => middleware,
        }),
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

      // when
      const result = loadMiddlewares(
        testApi({
          code: null,
        }),
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
      await expect(result).to.be.eventually.rejectedWith(/Missing implementation/)
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

      // when
      const result = await loadAuthorizationPatterns(
        testApi({
          code: authRule,
        }),
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

      // when
      const result = loadAuthorizationPatterns(
        testApi({
          code: null,
        }),
        log,
        { config },
      )

      // then
      await expect(result).to.be.eventually.rejectedWith('Failed to load foo:bar')
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
      config.addOut(knossos.resourceLoader, impl => {
        impl.addOut(code.link, config.blankNode())
      })

      // when
      const promise = loadResourceLoader(
        testApi({
          code: null,
        }),
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
      config.addOut(knossos.resourceLoader, impl => {
        impl.addOut(code.link, config.blankNode())
      })
      const loader = {}
      const factory = sinon.stub().resolves(loader)

      // when
      const loaded = await loadResourceLoader(
        testApi({
          code: factory,
        }),
        log,
        context,
        { config },
      )

      // then
      expect(loaded).to.eq(loader)
      expect(factory).to.have.been.calledWith(context)
    })
  })
})

import { expect } from 'chai'
import sinon from 'sinon'
import { testApi } from '@labyrinth/testing/hydra-box'
import { namedNode } from '@labyrinth/testing/nodeFactory'
import { Debugger } from 'debug'
import $rdf from 'rdf-ext'
import { knossos, code } from '@hydrofoil/vocabularies/builders/strict'
import { rdf, schema } from '@tpluscode/rdf-ns-builders/strict'
import { ResourcePerGraphStore, ResourceStore } from '../../lib/store'
import { loadMiddlewares } from '../../lib/settings'
import { Context } from '../../server'

describe('@hydrofoil/knossos/lib/settings', () => {
  const log: Debugger = sinon.spy() as any
  let getConfigurationId: sinon.SinonStub
  let context: Context
  let store: sinon.SinonStubbedInstance<ResourceStore>

  beforeEach(() => {
    getConfigurationId = sinon.stub().resolves($rdf.namedNode('/config'))
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
      // given
      getConfigurationId.resolves(undefined)

      // when
      const result = await loadMiddlewares(
        testApi(),
        log,
        context,
        { getConfigurationId },
      )

      // then
      expect(result).to.deep.eq({})
    })

    it('returns empty when there are no middlewares', async () => {
      // given
      store.load.resolves(namedNode('/config'))

      // when
      const result = await loadMiddlewares(
        testApi(),
        log,
        context,
        { getConfigurationId },
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
      store.load.resolves(config)
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      function middleware() {}

      // when
      const result = await loadMiddlewares(
        testApi({
          code: () => middleware,
        }),
        log,
        context,
        { getConfigurationId },
      )

      // then
      expect(result).to.deep.eq({
        before: [middleware, middleware],
        after: [middleware],
      })
    })
  })
})

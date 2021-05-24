import factory from 'knossos/lib/api'
import sinon from 'sinon'
import { ResourceStore } from 'knossos/lib/store'
import { expect } from 'chai'
import $rdf from 'rdf-ext'
import { Api } from 'hydra-box/Api'
import { namedNode } from '@labyrinth/testing/nodeFactory'

describe('@hydrofoil/knossos/lib/api', () => {
  const term = $rdf.namedNode('/api/docs')
  const codePath = './lib/hydra'
  const path = '/api/path'
  const sparql: any = {}
  let store: sinon.SinonStubbedInstance<ResourceStore>
  let loadClasses: sinon.SinonStub

  describe('API', () => {
    let api: Api

    beforeEach(async () => {
      loadClasses = sinon.stub().resolves($rdf.dataset().toStream())
      store = {
        exists: sinon.stub(),
        load: sinon.stub(),
        delete: sinon.stub(),
        save: sinon.stub(),
      }

      api = await factory({
        log: sinon.spy() as any,
        loadClasses,
      })({
        codePath,
        path,
        sparql,
      })
      api.term = term
    })

    afterEach(() => {
      sinon.restore()
    })

    describe('.init', () => {
      it('loads resource from store if it exists', async () => {
        // given
        store.exists.resolves(true)
        store.load.resolves(namedNode(term))

        // when
        await api.init()

        // then
        expect(store.load).to.have.been.calledWith(sinon.match(term))
      })

      it('does not load if API resource does not exist', async () => {
        // given
        store.exists.resolves(false)

        // when
        await api.init()

        // then
        expect(store.load).not.to.have.been.called
      })

      it('sets initialized', async () => {
        // given
        store.exists.resolves(true)
        store.load.resolves(namedNode(term))

        // when
        await api.init()

        // then
        expect(api.initialized).to.eq(true)
      })
    })
  })
})

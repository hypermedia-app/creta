import factory from 'knossos/lib/api'
import sinon from 'sinon'
import { expect } from 'chai'
import $rdf from 'rdf-ext'
import { Api } from 'hydra-box/Api'
import { namedNode } from '@labyrinth/testing/nodeFactory'

describe('@hydrofoil/knossos/lib/api', () => {
  const term = $rdf.namedNode('/api/docs')
  const codePath = './lib/hydra'
  const path = '/api/path'
  const sparql: any = {}
  let loadClasses: sinon.SinonStub
  let loadApiDocumentation: sinon.SinonStub

  describe('API', () => {
    let api: Api

    beforeEach(async () => {
      loadClasses = sinon.stub().resolves($rdf.dataset().toStream())
      loadApiDocumentation = sinon.stub().resolves($rdf.dataset().toStream())

      api = await factory({
        log: sinon.spy() as any,
        loadClasses,
        loadApiDocumentation,
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
      it('loads api resource ', async () => {
        // given
        loadApiDocumentation.resolves(namedNode(term).dataset.toStream())

        // when
        await api.init()

        // then
        expect(loadApiDocumentation).to.have.been.calledWith(sinon.match(term))
      })

      it('sets initialized', async () => {
        // given
        loadApiDocumentation.resolves(namedNode(term).dataset.toStream())

        // when
        await api.init()

        // then
        expect(api.initialized).to.eq(true)
      })
    })
  })
})

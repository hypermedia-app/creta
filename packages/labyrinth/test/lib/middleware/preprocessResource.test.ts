import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import clownface from 'clownface'
import sinon from 'sinon'
import * as ns from '@tpluscode/rdf-ns-builders'
import { literal } from '@rdfjs/data-model'
import request from 'supertest'
import { handler as hydraBox } from '@labyrinth/testing/hydra-box'
import { ex } from '@labyrinth/testing/namespace'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'
import $rdf from 'rdf-ext'
import { rdf } from '@tpluscode/rdf-ns-builders'
import { CodeLoader } from 'labyrinth/lib/code'
import TermSet from '@rdfjs/term-set'
import { knossosMock } from '@labyrinth/testing/knossos'
import { code } from '@hydrofoil/vocabularies/builders'
import { preprocessMiddleware, preprocessPayload } from '../../../lib/middleware/preprocessResource'

describe('@hydrofoil/labyrinth/lib/middleware/preprocessResource', () => {
  let preprocessHook: sinon.SinonSpy
  let app: express.Express
  let loadCode: CodeLoader

  beforeEach(() => {
    preprocessHook = sinon.spy()
    app = express()
    app.use(hydraBox({
      setup: async hydra => {
        clownface(hydra.api)
          .addOut(ns.hydra.supportedClass, ex.Person, clas => {
            clas.addOut(knossos.preprocessResource, literal('loads and call enrichment function', ex.TestHook))
          })
          .addOut(ns.hydra.supportedClass, ex.Project, clas => {
            clas.addOut(knossos.preprocessResource, parametrisedHook => {
              parametrisedHook.addList(code.arguments, ['foo', 'bar', 'baz'])
            })
          })
      },
    }))
    loadCode = sinon.stub().resolves(preprocessHook)
    knossosMock(app)
    app.use((req, res, next) => {
      req.loadCode = loadCode
      next()
    })
  })

  it('loads and calls hook function', async () => {
    // given
    app.use(preprocessMiddleware({
      getTypes() {
        return [ex.Person]
      },
      getResource: req => req.hydra.resource.clownface(),
      predicate: knossos.preprocessResource,
    }))

    // when
    await request(app).get('/')

    // then
    expect(preprocessHook).to.have.been.called
  })

  it('calls hook function with arguments', async () => {
    // given
    app.use(preprocessMiddleware({
      getTypes() {
        return [ex.Project]
      },
      getResource: req => req.hydra.resource.clownface(),
      predicate: knossos.preprocessResource,
    }))

    // when
    await request(app).get('/')

    // then
    expect(preprocessHook).to.have.been.calledWith(
      sinon.match.object,
      sinon.match.object,
      'foo',
      'bar',
      'baz',
    )
  })

  it('loads and calls hook function uniquely', async () => {
    // given
    app.use((req, res, next) => {
      clownface(req.hydra.api)
        .namedNode(ex.Agent)
        .addOut(knossos.preprocessResource, ex.TestHookAgent)
      next()
    })
    app.use(preprocessMiddleware({
      getTypes() {
        return [ex.Person, ex.Person, ex.Agent]
      },
      getResource: req => req.hydra.resource.clownface(),
      predicate: knossos.preprocessResource,
    }))

    // when
    await request(app).get('/')

    // then
    expect(loadCode).to.have.been.calledTwice
    expect(preprocessHook).to.have.been.calledTwice
  })

  it('does not call resource getter if no hooks are found', async () => {
    // given
    const getResource = sinon.spy()
    app.use(preprocessMiddleware({
      getTypes() {
        return []
      },
      getResource,
      predicate: knossos.preprocessResource,
    }))

    // when
    await request(app).get('/')

    // then
    expect(preprocessHook).not.to.have.been.called
    expect(getResource).not.to.have.been.called
  })

  it('does not call hook if no resource is loaded', async () => {
    // given
    app.use(preprocessMiddleware({
      getTypes() {
        return [ex.Person]
      },
      getResource() {
        return undefined
      },
      predicate: knossos.preprocessResource,
    }))

    // when
    await request(app).get('/')

    // then
    expect(preprocessHook).not.to.have.been.called
  })

  describe('preprocessPayload', () => {
    it('loads hooks for the sum of resource and payload types', async () => {
      // given
      app.use(async function fakePayload(req, res, next) {
        req.dataset = async () => $rdf.dataset()
        req.resource = async () => {
          return clownface({ dataset: $rdf.dataset() })
            .namedNode('')
            .addOut(rdf.type, ex.Person)
        }
        req.hydra.resource.types = new TermSet([ex.Agent])
        clownface(req.hydra.api)
          .namedNode(ex.Person)
          .addOut(knossos.preprocessPayload, $rdf.blankNode('person-hook'))
          .namedNode(ex.Agent)
          .addOut(knossos.preprocessPayload, $rdf.blankNode('agent-hook'))
        next()
      })
      app.use(preprocessPayload)

      // when
      await request(app).post('/')

      // then
      expect(loadCode).to.have.been.calledTwice
      expect(loadCode).to.have.been.calledWithMatch(
        sinon.match(pointer => pointer.term.equals($rdf.blankNode('person-hook'))),
      )
      expect(loadCode).to.have.been.calledWithMatch(
        sinon.match(pointer => pointer.term.equals($rdf.blankNode('agent-hook'))),
      )
    })
  })
})

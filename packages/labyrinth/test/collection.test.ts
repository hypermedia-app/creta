import { Term } from 'rdf-js'
import express from 'express'
import request from 'supertest'
import { handler as hydraBox } from '@labyrinth/testing/hydra-box'
import { ex } from '@labyrinth/testing/namespace'
import clownface, { AnyContext, AnyPointer } from 'clownface'
import DatasetExt from 'rdf-ext/lib/Dataset'
import $rdf from 'rdf-ext'
import { rdf } from '@tpluscode/rdf-ns-builders/strict'
import { createGetHandler } from '../collection'

describe('@hydrofoil/labyrinth/collection', () => {
  let members: Term[]
  let memberData: AnyPointer<AnyContext, DatasetExt>

  beforeEach(() => {
    members = [ex.Foo, ex.Bar, ex.Baz]
    memberData = clownface({ dataset: $rdf.dataset() })
    memberData.node(members).addOut(rdf.type, ex.Person)
  })

  async function initQueries() {
    return {
      queries: {
        members: () => members,
        memberData: async () => memberData.dataset.toStream(),
        total: () => members.length,
      },
    }
  }

  describe('get', () => {
    it('sets canonical link header', async () => {
      // given
      const app = express()
      app.use(hydraBox({
        setup: hydra => {
          hydra.resource.term = ex.people
        },
      }))
      app.use(createGetHandler({
        initQueries,
      }))

      // when
      const response = request(app).get('/')

      // then
      // eslint-disable-next-line prefer-regex-literals
      await response.expect('link', new RegExp('<http://example.com/people>; rel="canonical"'))
    })
  })
})

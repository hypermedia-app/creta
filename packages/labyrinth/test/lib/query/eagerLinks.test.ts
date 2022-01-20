import { describe, beforeEach } from 'mocha'
import { expect } from 'chai'
import { blankNode } from '@labyrinth/testing/nodeFactory'
import { hyper_query } from '@hydrofoil/vocabularies/builders/strict'
import { StreamClient } from 'sparql-http-client/StreamClient'
import sinon from 'sinon'
import $rdf from 'rdf-ext'
import { loadLinkedResources } from '../../../lib/query/eagerLinks'

describe('@hydrofoil/labyrinth/lib/query/eagerLinks', () => {
  describe('loadLinkedResources', () => {
    let client: StreamClient

    beforeEach(() => {
      client = {
        query: {
          construct: sinon.stub().resolves($rdf.dataset().toStream()),
        },
      } as any
    })

    it('ignores includes without query:path', async () => {
      // given
      const resource = blankNode()
      const include = blankNode()

      // when
      await loadLinkedResources(resource, include, client)

      // expect
      expect(client.query.construct).not.to.have.been.called
    })

    it('ignores includes with multiple query:path', async () => {
      // given
      const resource = blankNode()
      const include = blankNode()
        .addOut(hyper_query.path, null)
        .addOut(hyper_query.path, null)

      // when
      await loadLinkedResources(resource, include, client)

      // expect
      expect(client.query.construct).not.to.have.been.called
    })
  })
})

import { describe, beforeEach } from 'mocha'
import { expect } from 'chai'
import { blankNode, namedNode } from '@labyrinth/testing/nodeFactory'
import { hyper_query } from '@hydrofoil/vocabularies/builders/strict'
import { schema } from '@tpluscode/rdf-ns-builders/strict'
import { sparql } from '@tpluscode/rdf-string'
import * as Sparql from '@labyrinth/testing/sparql'
import { loadLinkedResources } from '../../../lib/query/eagerLinks'

describe('@hydrofoil/labyrinth/lib/query/eagerLinks', () => {
  describe('loadLinkedResources', () => {
    let client: Sparql.StubbedClient

    beforeEach(() => {
      client = Sparql.client()
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

    it('does not load resource which is the link parent', async () => {
      // given
      const foo = namedNode('https://example.com/foo')
      const bar = namedNode('https://example.com/bar')
      const include = blankNode()
        .addOut(hyper_query.path, schema.knows)

      // when
      foo.addOut(schema.knows, [foo, bar])
      await loadLinkedResources(foo, include, client)

      // expect
      expect(client.query.construct.firstCall.firstArg).to.be.a.query(sparql`DESCRIBE <https://example.com/bar>`)
    })
  })
})

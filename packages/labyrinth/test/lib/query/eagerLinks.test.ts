import { describe, beforeEach } from 'mocha'
import { expect } from 'chai'
import { blankNode, namedNode } from '@labyrinth/testing/nodeFactory'
import { hyper_query } from '@hydrofoil/vocabularies/builders/strict'
import { foaf, schema } from '@tpluscode/rdf-ns-builders/strict'
import { sparql } from '@tpluscode/rdf-string'
import * as Sparql from '@labyrinth/testing/sparql'
import { ex } from '@labyrinth/testing/namespace'
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
      await loadLinkedResources(resource.terms, include.toArray(), client)

      // expect
      expect(client.query.construct).not.to.have.been.called
    })

    it('ignores includes with invalid query:path', async () => {
      // given
      const resource = blankNode()
      const include = blankNode()
        .addOut(hyper_query.path, null)

      // when
      await loadLinkedResources(resource.terms, include.toArray(), client)

      // expect
      expect(client.query.construct).not.to.have.been.called
    })

    it('combines multiple query:path', async () => {
      // given
      const resource = blankNode()
      const include = blankNode()
        .addOut(hyper_query.path, schema.knows)
        .addOut(hyper_query.path, foaf.knows)

      // when
      resource
        .addOut(schema.knows, ex.baz)
        .addOut(foaf.knows, ex.bar)
      await loadLinkedResources(resource.terms, include.toArray(), client)

      // expect
      expect(client.query.construct.firstCall.firstArg).to.be.a.query(sparql`DESCRIBE ${ex.baz} ${ex.bar}`)
    })

    it('does not load resource which is the link parent', async () => {
      // given
      const foo = namedNode(ex.foo)
      const bar = namedNode(ex.bar)
      const include = blankNode()
        .addOut(hyper_query.path, schema.knows)

      // when
      foo.addOut(schema.knows, [foo, bar])
      await loadLinkedResources(foo.terms, include.toArray(), client)

      // expect
      expect(client.query.construct.firstCall.firstArg).to.be.a.query(sparql`DESCRIBE ${ex.bar}`)
    })
  })
})

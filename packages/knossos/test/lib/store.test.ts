import { client, testData } from '@labyrinth/testing/client'
import { sparql } from '@tpluscode/rdf-string'
import { expect } from 'chai'
import { ex } from '@labyrinth/testing/namespace'
import { foaf, rdf, schema } from '@tpluscode/rdf-ns-builders'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import $rdf from 'rdf-ext'
import { namedNode } from '@labyrinth/testing/nodeFactory'
import clownface from 'clownface'
import { ResourcePerGraphStore } from '../../lib/store'

describe('@hydrofoil/knossos/lib/store', () => {
  describe('ResourcePerGraphStore', () => {
    const store = new ResourcePerGraphStore(client)

    beforeEach(async () => {
      await testData(sparql`
        GRAPH ${ex.john} {
          ${ex.john} a ${foaf.Person}
        }
      `)
    })

    describe('exists', () => {
      it('returns false when resource does not exist', () => {
        return expect(store.exists(ex.foo)).to.eventually.eq(false)
      })

      it('returns true when resource exists in its graph', () => {
        return expect(store.exists(ex.john)).to.eventually.eq(true)
      })
    })

    describe('load', () => {
      it('returns pointer to the loaded resource', async () => {
        // when
        const resource = await store.load(ex.john)

        // then
        expect(resource.out(rdf.type).term).to.deep.eq(foaf.Person)
      })
    })

    describe('delete', () => {
      it('removes the graph', async () => {
        // when
        await store.delete(ex.john)

        // then
        const removed = await $rdf.dataset().import(await DESCRIBE`${ex.john}`.execute(client.query))
        expect(removed.size).to.eq(0)
      })
    })

    describe('save', () => {
      it('removes previous graph contents', async () => {
        // given
        const resource = namedNode(ex.john)
          .addOut(rdf.type, schema.Person)

        // when
        await store.save(resource)

        // then
        const dataset = await $rdf.dataset().import(await DESCRIBE`${ex.john}`.execute(client.query))
        const saved = clownface({ dataset }).node(ex.john)
        expect(saved.out(rdf.type).term).to.deep.eq(schema.Person)
      })
    })
  })
})

import { expect } from 'chai'
import { hydraBox } from '@labyrinth/testing/hydra-box'
import { GraphPointer } from 'clownface'
import { namedNode } from '@labyrinth/testing/nodeFactory'
import { ex } from '@labyrinth/testing/namespace'
import * as ns from '@tpluscode/rdf-ns-builders'
import RdfResource from '@tpluscode/rdfine'
import * as Hydra from '@rdfine/hydra'
import { HydraBox } from 'hydra-box'
import { Labyrinth } from 'labyrinth/index'
import { client } from '@labyrinth/testing/sparql'
import $rdf from 'rdf-ext'
import staticCollection from '../../../lib/query/staticCollection'

RdfResource.factory.addMixin(...Object.values(Hydra))

describe('@hydrofoil/labyrinth/lib/query/staticCollection', () => {
  let hydra: HydraBox
  let labyrinth: Labyrinth
  let collection: GraphPointer

  beforeEach(async () => {
    hydra = await hydraBox()
    labyrinth = {
      sparql: client(),
    } as any
    collection = namedNode(ex.people)
      .addOut(ns.hydra.member, [ex.Foo, ex.Bar, ex.Baz])
  })

  function testInstance() {
    return staticCollection({
      hydra,
      labyrinth,
    }, collection)
  }

  describe('members', () => {
    it('return explicit members', () => {
      // given
      const queries = testInstance()

      // when
      const members = queries.members()

      // then
      expect(members).to.deep.contain.members([ex.Foo, ex.Bar, ex.Baz])
    })
  })

  describe('total', () => {
    it('return count of explicit members', () => {
      // given
      const queries = testInstance()

      // when
      const members = queries.total()

      // then
      expect(members).to.eq(3)
    })
  })

  describe('memberData', () => {
    it('it returns empty if there are no members', async () => {
      // given
      const queries = testInstance()

      // when
      const members = await $rdf.dataset().import(await queries.memberData([]))

      // then
      expect(members.size).to.be.eq(0)
    })
  })
})

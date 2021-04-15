import { describe } from 'mocha'
import { namedNode } from '@labyrinth/testing/nodeFactory'
import { expect } from 'chai'
import { as } from '@tpluscode/rdf-ns-builders'
import { created, updated, deleted } from '../activity'

describe('@hydrofoil/express-events/activity', () => {
  describe('created', () => {
    it('returns resource of correct type', () => {
      // when
      const activity = created(namedNode('created'))

      // then
      expect(activity.types).to.deep.contain.members([as.Create])
    })

    it('does not allow overriding object', () => {
      // given
      const object = namedNode('created')

      // when
      const activity = created(object, { object: namedNode('foo') })

      // then
      expect(activity.object).to.eq(object)
    })
  })

  describe('updated', () => {
    it('returns resource of correct type', () => {
      // when
      const activity = updated(namedNode('updated'))

      // then
      expect(activity.types).to.deep.contain.members([as.Update])
    })

    it('does not allow overriding object', () => {
      // given
      const object = namedNode('created')

      // when
      const activity = updated(object, { object: namedNode('foo') })

      // then
      expect(activity.object).to.eq(object)
    })
  })

  describe('deleted', () => {
    it('returns resource of correct type', () => {
      // when
      const activity = deleted(namedNode('deleted'))

      // then
      expect(activity.types).to.deep.contain.members([as.Delete])
    })

    it('does not allow overriding object', () => {
      // given
      const object = namedNode('created')

      // when
      const activity = deleted(object, { object: namedNode('foo') })

      // then
      expect(activity.object).to.eq(object)
    })
  })
})

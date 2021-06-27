import { expect } from 'chai'
import { parseExtraVocabs } from '../../../lib/command/extraVocabs'

describe('@hydrofoil/talos/lib/command/extraVocabs', () => {
  describe('parseExtraVocabs', () => {
    it('returns empty prefixes when not given', () => {
      // when
      const vocabs = parseExtraVocabs('@foo/vocabularies')

      // then
      expect(vocabs).to.deep.contain.members([{
        package: '@foo/vocabularies',
        prefixes: [],
      }])
    })

    it('returns empty prefixes when trailing comma', () => {
      // when
      const vocabs = parseExtraVocabs('@foo/vocabularies,')

      // then
      expect(vocabs).to.deep.contain.members([{
        package: '@foo/vocabularies',
        prefixes: [],
      }])
    })

    it('returns prefixes from string', () => {
      // when
      const vocabs = parseExtraVocabs('@foo/vocabularies,foo,bar,baz')

      // then
      expect(vocabs).to.deep.contain.members([{
        package: '@foo/vocabularies',
        prefixes: ['foo', 'bar', 'baz'],
      }])
    })

    it('trims prefixes from string and removes empt', () => {
      // when
      const vocabs = parseExtraVocabs('@foo/vocabularies, foo, ,baz  ')

      // then
      expect(vocabs).to.deep.contain.members([{
        package: '@foo/vocabularies',
        prefixes: ['foo', 'baz'],
      }])
    })

    it('combines with previous', () => {
      // given
      const parsedPreviously = [{
        package: '@foo/vocabs',
        prefixes: ['foo', 'bar'],
      }]

      // when
      const vocabs = parseExtraVocabs('@foo/vocabularies', parsedPreviously)

      // then
      expect(vocabs).to.deep.contain.members([{
        package: '@foo/vocabularies',
        prefixes: [],
      }])
    })
  })
})

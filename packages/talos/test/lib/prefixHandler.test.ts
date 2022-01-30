import { Stream } from 'stream'
import { expect } from 'chai'
import { parsers } from '@rdfjs/formats-common'
import toStream from 'into-stream'
import getStream from 'get-stream'
import { optionsFromPrefixes } from '../../lib/prefixHandler'

describe('@hydrofoil/talos/lib/prefixHandler', () => {
  function parse(str: string): Stream {
    return parsers.import('text/turtle', toStream(str)) as any
  }

  describe('optionsFromPrefixes', () => {
    it('sets options from parsed prefixes', async () => {
      // given
      const options = {}

      // when
      const stream = parse(`prefix talos: <foo:bar>
prefix talos: <foo:baz>
prefix talos: <another:also%20baz>`)
      stream.on('prefix', optionsFromPrefixes(options))
      await getStream(stream)

      // then
      expect(options).to.have.property('foo', 'baz')
      expect(options).to.have.property('another', 'also baz')
    })

    it('ignores other prefixes', async () => {
      // given
      const options = {}

      // when
      const stream = parse('prefix schema: <http://schema.org/>')
      stream.on('prefix', optionsFromPrefixes(options))
      await getStream(stream)

      // then
      expect(options).to.deep.eq({})
    })
  })
})

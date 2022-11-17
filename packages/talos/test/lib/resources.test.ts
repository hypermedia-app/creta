import { DatasetCore } from 'rdf-js'
import path from 'path'
import { expect } from 'chai'
import namespace from '@rdfjs/namespace'
import toCanonical from 'rdf-dataset-ext/toCanonical'
import { talosNs } from 'talos/lib/ns'
import { fromDirectories } from '../../lib/resources'
import { debug } from '../../lib/log'

debug.enabled = true

const ns = namespace('https://example.com')

describe('@hydrofoil/talos/lib/resources', () => {
  describe('fromDirectories', () => {
    let dataset: DatasetCore

    beforeEach(async () => {
      const dirs = [
        path.resolve(__dirname, '../resources'),
        path.resolve(__dirname, '../resources.foo'),
        path.resolve(__dirname, '../resources.bar'),
      ]
      dataset = await fromDirectories(dirs, ns().value)
    })

    it('merges resources from multiple graph documents', function () {
      const resource = dataset.match(null, null, null, ns())

      expect(toCanonical(resource)).to.matchSnapshot(this)
    })

    it('merges resources from dataset and graph documents', function () {
      const resource = dataset.match(null, null, null, ns('/trig/users/john-doe'))

      expect(toCanonical(resource)).to.matchSnapshot(this)
    })

    it('merges resources from multiple dataset documents', function () {
      const resource = dataset.match(null, null, null, ns('/trig/users/jane-doe'))

      expect(toCanonical(resource)).to.matchSnapshot(this)
    })

    it('marks a resource for "default" by default', () => {
      const [{ object: action }, ...more] = dataset.match(ns(), talosNs.action, null, talosNs.resources)

      expect(action.value).to.eq('default')
      expect(more).to.be.empty
    })

    it('marks a resource for "merge" when prefix is used', () => {
      const [{ object: action }, ...more] = dataset.match(ns('/project/creta/user.group/admins'), talosNs.action, null, talosNs.resources)

      expect(action.value).to.eq('merge')
      expect(more).to.be.empty
    })
  })
})

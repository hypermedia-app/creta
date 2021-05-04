import path from 'path'
import { pathExists, promises as fs } from 'fs-extra'
import { init } from 'knossos/lib/command'
import temp from 'tempy'
import { expect } from 'chai'
import $rdf from 'rdf-ext'
import clownface from 'clownface'
import { rdf, rdfs, schema } from '@tpluscode/rdf-ns-builders'

function rootPath(pathName: string) {
  return path.resolve(__dirname, '../../test-resources', pathName)
}

describe('@hydrofoil/knossos/lib/command/init', () => {
  let dest: string
  let paths: string[]
  let packages: string[]

  beforeEach(() => {
    dest = temp.directory()
    paths = []
    packages = []
  })

  afterEach(async () => {
    await fs.rm(dest, { recursive: true, force: true })
  })

  it('copies source resources in turtle format as canonical n-quads', async () => {
    // given
    paths.push(rootPath('formats'))
    const expected = clownface({ dataset: $rdf.dataset() })
      .namedNode('')
      .addOut(rdf.type, rdfs.Class)
      .addOut(rdfs.subClassOf, schema.Person)

    // when
    const result = await init({
      dest,
      paths,
      packages,
    })

    // then
    expect(result).to.eq(0)
    const writtenFile = (await fs.readFile(path.resolve(dest, 'resources/api/classes/User.nq'))).toString()
    expect(writtenFile).to.eq(expected.dataset.toCanonical())
  })

  it('returns error when a file fails to parse', async () => {
    // given
    paths.push(rootPath('with-errors'))

    // when
    const result = await init({
      dest,
      paths,
      packages,
    })

    // then
    expect(result).to.eq(1)
    const goodFile = path.resolve(dest, 'resources/user/john.nq')
    const badFile = path.resolve(dest, 'resources/users.nq')
    await expect(pathExists(goodFile)).to.eventually.eq(true)
    await expect(pathExists(badFile)).to.eventually.eq(false)
  })

  it('copies "resources" directory from events package', async () => {
    // when
    const result = await init({
      dest,
      paths,
      packages,
    })

    // then
    expect(result).to.be.eq(0)
    const EventHandler = path.resolve(dest, 'resources/api/events/EventHandler.nq')
    await expect(pathExists(EventHandler)).to.eventually.eq(true)
  })

  it('copies "resources" directory from additional package', async () => {
    // given
    packages.push('@hydrofoil/test-package')

    // when
    const result = await init({
      dest,
      paths,
      packages,
    })

    // then
    expect(result).to.be.eq(0)
    const EventHandler = path.resolve(dest, 'resources/foo.nq')
    await expect(pathExists(EventHandler)).to.eventually.eq(true)
  })
})

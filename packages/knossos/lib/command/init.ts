import { dirname, resolve, relative } from 'path'
import type { Readable } from 'stream'
import { Stream } from 'rdf-js'
import { createReadStream, createWriteStream, ensureFile } from 'fs-extra'
import walk from '@fcostarodrigo/walk'
import reader from '@graphy/content.trig.read'
import { serializers } from '@rdfjs-elements/formats-pretty'
import $rdf from 'rdf-ext'
import debug from 'debug'
import DatasetExt from 'rdf-ext/lib/Dataset'
import toPromise from 'stream-to-promise'

const log = debug('knossos')
log.enabled = true

interface Init {
  paths: string[]
  packages: string[]
  dest: string
}

const alwaysPackages = [
  '@hydrofoil/knossos-events',
]

async function processFile({ sourceDir, file, destDir }: any) {
  const prefixes: Record<string, string> = {}

  const relativePath = relative(sourceDir, file)
  log('Loading resource %s', relativePath)
  const outFile = resolve(destDir, relativePath)

  const stream: Stream = createReadStream(file).pipe(reader())

  stream.on('prefix', (prefix: string, ns: string) => {
    prefixes[prefix] = ns
  })

  let dataset: DatasetExt

  try {
    dataset = await $rdf.dataset().import(stream)
  } catch (e) {
    throw new Error(`Failed to parse ${relativePath}: ${e.message}`)
  }
  await ensureFile(outFile)

  const quadStream = serializers.import('text/turtle', dataset.toStream(), {
    prefixes,
  }) as any as Readable

  return toPromise(quadStream.pipe(createWriteStream(outFile)))
    .then(() => log('Saved resource file %s', relativePath))
}

export async function init({ dest, paths, packages }: Init): Promise<number> {
  let errors = 0
  const destDir = resolve(dest, 'resources')

  const sourcePaths: string[] = [
    ...paths,
    ...[...alwaysPackages, ...packages].reduce<string[]>((arr, name) => {
      const path = dirname(require.resolve(`${name}/package.json`))
      return path ? [...arr, path] : arr
    }, []),
  ]

  const filesSaved: Promise<void>[] = []
  for (const sourceRootPath of sourcePaths) {
    const sourceDir = resolve(sourceRootPath, 'resources')

    for await (const file of walk(sourceDir)) {
      const promise = processFile({
        file,
        destDir,
        sourceDir,
      }).catch(e => {
        errors = errors + 1
        log(e.message)
      })
      filesSaved.push(promise)
    }
  }

  await Promise.all(filesSaved)

  return errors
}

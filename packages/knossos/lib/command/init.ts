import { dirname, resolve, relative } from 'path'
import type { Readable } from 'stream'
import { createReadStream, createWriteStream, ensureFile } from 'fs-extra'
import walk from '@fcostarodrigo/walk'
import { parsers, serializers } from '@rdfjs-elements/formats-pretty'
import $rdf from 'rdf-ext'
import debug from 'debug'
import DatasetExt from 'rdf-ext/lib/Dataset'

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
      const relativePath = relative(sourceDir, file)
      log('Loading resource %s', relativePath)
      const outFile = resolve(destDir, relativePath)

      const mediaType = 'text/turtle'
      const stream = parsers.import(mediaType, createReadStream(file))
      if (!stream) {
        log('Failed to parse %s. Unsupported media type %s', relativePath, mediaType)
        errors = errors + 1
        continue
      }

      let dataset: DatasetExt

      try {
        dataset = await $rdf.dataset().import(stream)
      } catch (e) {
        log('Failed to parse %s: %s', relativePath, e.message)
        errors = errors + 1
        continue
      }
      await ensureFile(outFile)

      const quadStream = serializers.import('text/turtle', dataset.toStream()) as any as Readable
      quadStream.pipe(createWriteStream(outFile))

      const promise = new Promise((resolve, reject) => {
        quadStream.on('end', resolve)
        quadStream.on('error', reject)
      }).then(() => log('Saved resource file %s', relativePath))

      filesSaved.push(promise)
    }
  }

  await Promise.all(filesSaved)

  return errors
}

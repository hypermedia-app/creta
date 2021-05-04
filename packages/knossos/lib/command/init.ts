import { dirname, resolve, relative } from 'path'
import { createReadStream, ensureFile, promises as fs } from 'fs-extra'
import walk from '@fcostarodrigo/walk'
import { parsers } from '@rdfjs/formats-common'
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
      const outPath = relativePath.replace(/ttl$/, 'nq')
      const outFile = resolve(destDir, outPath)

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
      filesSaved.push(fs.writeFile(outFile, dataset.toCanonical())
        .then(() => log('Saved resource file %s', outPath)))
    }
  }

  await Promise.all(filesSaved)

  return errors
}

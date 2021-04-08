import { promisify } from 'util'
import path from 'path'
import * as fs from 'fs'
import glob from 'glob'
import StreamClient, { StreamClientOptions } from 'sparql-http-client/StreamClient'
import $rdf from 'rdf-ext'
import { parsers } from '@rdfjs/formats-common'
import { expand } from '@zazuko/rdf-vocabularies'
import { Debugger } from 'debug'
import clownface from 'clownface'
import { ResourcePerGraphStore } from './store'

type Options = StreamClientOptions & {
  log: Debugger
  api: string
  patterns: string[]
  overwrite: boolean
}

const globp = promisify(glob)

export async function bootstrap({ log, api, patterns, overwrite, ...options }: Options): Promise<void> {
  const store = new ResourcePerGraphStore(new StreamClient(options))
  const cwd = path.resolve(__dirname, '../resources')

  for (const pattern of patterns) {
    const files = await globp(pattern, { cwd, realpath: true })

    for (const file of files) {
      let url: string
      if (file.includes(':')) {
        const name = path.basename(file, '.ttl')

        try {
          url = expand(name)
        } catch (e) {
          log(e.message)
          continue
        }
      } else {
        const resourcePath = path.relative(cwd, file)
          .replace(/\..+$/, '')
          .replace(/\/?index$/, '')

        url = `${api}/${resourcePath}`
      }

      const dataset = await $rdf.dataset().import(parsers.import('text/turtle', fs.createReadStream(file), {
        baseIRI: url,
      })!)
      const pointer = clownface({ dataset }).namedNode(url)

      if (await store.exists(pointer.term)) {
        if (!overwrite) {
          log(`Skipping resource ${url}`)
          continue
        }
        log(`Replacing resource ${url}`)
      } else {
        log(`Creating resource ${url}`)
      }

      await store.save(pointer)
    }
  }
}

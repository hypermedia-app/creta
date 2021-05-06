import path from 'path'
import * as fs from 'fs'
import { DatasetCore } from 'rdf-js'
import walk from '@fcostarodrigo/walk'
import * as mime from 'mime-types'
import StreamClient, { StreamClientOptions } from 'sparql-http-client'
import $rdf from 'rdf-ext'
import { parsers } from '@rdfjs/formats-common'
import { Debugger } from 'debug'
import clownface from 'clownface'
import { ResourcePerGraphStore } from '@hydrofoil/knossos/lib/store'

type Options = StreamClientOptions & {
  log: Debugger
  api: string
  cwd: string
}

export async function bootstrap({ log, api, cwd, ...options }: Options): Promise<void> {
  const store = new ResourcePerGraphStore(new StreamClient(options))

  for await (const file of walk(cwd)) {
    const relative = path.relative(cwd, file)
    const resourcePath = path.relative(cwd, file)
      .replace(/\..+$/, '')
      .replace(/\/?index$/, '')

    const url = `${api}/${resourcePath}`

    const mediaType = mime.lookup(file)
    if (!mediaType) {
      log('Could not determine media type for file %s', relative)
      continue
    }

    const parserStream = parsers.import(mediaType, fs.createReadStream(file), {
      baseIRI: url,
    })
    if (!parserStream) {
      log('Unsupported media type %s from %s', mediaType, relative)
      continue
    }

    let dataset: DatasetCore
    try {
      dataset = await $rdf.dataset().import(parserStream)
    } catch (e) {
      log('Failed to parse %s: %s', relative, e.message)
      continue
    }

    const pointer = clownface({ dataset }).namedNode(url)

    if (await store.exists(pointer.term)) {
      log(`Replacing resource ${url}`)
    } else {
      log(`Creating resource ${url}`)
    }

    await store.save(pointer)
  }
}

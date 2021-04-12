import { promisify } from 'util'
import path from 'path'
import * as fs from 'fs'
import glob from 'glob'
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

const globp = promisify(glob)

export async function bootstrap({ log, api, cwd, ...options }: Options): Promise<void> {
  const store = new ResourcePerGraphStore(new StreamClient(options))
  const files = await globp('**/*.ttl', { cwd, realpath: true })

  for (const file of files) {
    const resourcePath = path.relative(cwd, file)
      .replace(/\..+$/, '')
      .replace(/\/?index$/, '')

    const url = `${api}/${resourcePath}`

    const dataset = await $rdf.dataset().import(parsers.import('text/turtle', fs.createReadStream(file), {
      baseIRI: url,
    })!)
    const pointer = clownface({ dataset }).namedNode(url)

    if (await store.exists(pointer.term)) {
      log(`Replacing resource ${url}`)
    } else {
      log(`Creating resource ${url}`)
    }

    await store.save(pointer)
  }
}

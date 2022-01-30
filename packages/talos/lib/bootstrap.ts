import path from 'path'
import { NamedNode } from 'rdf-js'
import walk from '@fcostarodrigo/walk'
import StreamClient, { StreamClientOptions } from 'sparql-http-client'
import $rdf from 'rdf-ext'
import clownface from 'clownface'
import { ResourcePerGraphStore } from '@hydrofoil/knossos/lib/store'
import { hydra } from '@tpluscode/rdf-ns-builders/strict'
import { getPatchedStream } from './fileStream'
import { log } from './log'
import { optionsFromPrefixes } from './prefixHandler'

type Options = StreamClientOptions & {
  api: string
  apiUri: NamedNode
  cwd: string
}

interface ResourceOptions {
  existingResource: 'merge' | 'overwrite'
}

export async function bootstrap({ api, apiUri, cwd, ...options }: Options): Promise<void> {
  const store = new ResourcePerGraphStore(new StreamClient(options))

  for await (const file of walk(cwd)) {
    const relative = path.relative(cwd, file)
    const resourcePath = path.relative(cwd, file)
      .replace(/\.[^.]+$/, '')
      .replace(/\/?index$/, '')

    const url = resourcePath === ''
      ? encodeURI(api)
      : encodeURI(`${api}/${resourcePath}`)

    const parserStream = getPatchedStream(file, cwd, api, url)
    if (!parserStream) {
      continue
    }

    const resourceOptions: ResourceOptions = {
      existingResource: 'overwrite',
    }
    parserStream.on('prefix', optionsFromPrefixes(resourceOptions))
    const dataset = $rdf.dataset()
    try {
      for await (const quad of parserStream) {
        dataset.add(quad)
      }
    } catch (e: any) {
      log('Failed to parse %s: %s', relative, e.message)
      continue
    }

    const pointer = clownface({ dataset })
      .namedNode(url)
      .addOut(hydra.apiDocumentation, apiUri)

    if (await store.exists(pointer.term)) {
      if (resourceOptions.existingResource === 'overwrite') {
        log(`Replacing resource ${url}`)
      } else {
        log(`Merging existing resource ${url}`)
        const current = await store.load(pointer.term)
        pointer.dataset.addAll(current.dataset)
      }
    } else {
      log(`Creating resource ${url}`)
    }

    await store.save(pointer)
  }
}

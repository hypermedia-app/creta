import { NamedNode } from 'rdf-js'
import StreamClient, { StreamClientOptions } from 'sparql-http-client'
import type DatasetExt from 'rdf-ext/lib/Dataset'
import clownface from 'clownface'
import { ResourcePerGraphStore } from '@hydrofoil/knossos/lib/store'
import { hydra } from '@tpluscode/rdf-ns-builders'
import { isNamedNode } from 'is-graph-pointer'
import { log } from './log'
import { talosNs } from './ns'

type Bootstrap = StreamClientOptions & {
  dataset: DatasetExt
  apiUri: NamedNode
}

export async function bootstrap({ dataset, apiUri, ...options }: Bootstrap): Promise<void> {
  const store = new ResourcePerGraphStore(new StreamClient(options))

  const graph = clownface({ dataset, graph: talosNs.resources })
  const resources = graph.has(talosNs.action)
  for (const resource of resources.toArray().filter(isNamedNode)) {
    const pointer = clownface({ dataset })
      .namedNode(resource)
      .addOut(hydra.apiDocumentation, apiUri)

    const action = resource.out(talosNs.action).value
    const exists = await store.exists(pointer.term)
    if (exists && action === 'skip') {
      log(`Skipping resource ${resource}`)
      continue
    }

    if (exists) {
      if (action === 'overwrite') {
        log(`Replacing resource ${resource}`)
      } else {
        log(`Merging existing resource ${resource}`)
        const current = await store.load(pointer.term)
        pointer.dataset.addAll(current.dataset)
      }
    } else {
      log(`Creating resource ${resource}`)
    }

    await store.save(pointer)
  }
}

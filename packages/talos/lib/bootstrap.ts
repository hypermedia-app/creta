import { NamedNode } from 'rdf-js'
import type DatasetExt from 'rdf-ext/lib/Dataset'
import clownface from 'clownface'
import type { ResourceStore } from '@hydrofoil/knossos/lib/store'
import { hydra } from '@tpluscode/rdf-ns-builders'
import { isNamedNode } from 'is-graph-pointer'
import $rdf from 'rdf-ext'
import { log } from './log'
import { talosNs } from './ns'

type Bootstrap = {
  store: ResourceStore
  dataset: DatasetExt
  apiUri: NamedNode
}

export async function bootstrap({ dataset, apiUri, store }: Bootstrap): Promise<void> {
  const graph = clownface({ dataset, graph: talosNs.resources })
  const resources = graph.has(talosNs.action)
  for (const resource of resources.toArray().filter(isNamedNode)) {
    const resourceData = dataset.match(null, null, null, resource.term)
      .map(({ subject, predicate, object }) => $rdf.quad(subject, predicate, object))
    const pointer = clownface({ dataset: resourceData })
      .namedNode(resource)
      .addOut(hydra.apiDocumentation, apiUri)

    const action = resource.out(talosNs.action).term
    const exists = await store.exists(pointer.term)
    if (exists && talosNs.skip.equals(action)) {
      log(`Skipping resource ${resource}`)
      continue
    }

    if (exists) {
      if (talosNs.merge.equals(action)) {
        log(`Merging existing resource ${resource}`)
        const current = await store.load(pointer.term)
        pointer.dataset.addAll(current.dataset)
      } else {
        log(`Replacing resource ${resource}`)
      }
    } else {
      log(`Creating resource ${resource}`)
    }

    await store.save(pointer)
  }
}

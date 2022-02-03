import { NamedNode } from 'rdf-js'
import { Request } from 'express'
import clownface, { GraphPointer } from 'clownface'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import $rdf from 'rdf-ext'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { hyper_query } from '@hydrofoil/vocabularies/builders'
import { loadLinkedResources } from './eagerLinks'

export default function (req: Pick<Request, 'hydra' | 'labyrinth'>, collection: GraphPointer) {
  const members = collection.out(hydra.member).terms
  const api = clownface(req.hydra.api)
  const client = req.labyrinth.sparql

  return {
    async members() {
      return members
    },
    async totals() {
      return members.length
    },
    async memberData(ids: NamedNode[]) {
      if (ids.length === 0) {
        return $rdf.dataset().toStream()
      }

      const memberData = await $rdf.dataset().import(await DESCRIBE`${ids}`.execute(client.query))
      const eagerLoadByCollection = api.node([req.hydra.operation.term, ...req.hydra.resource.types]).out(hyper_query.memberInclude)
      const eagerLoadByMembers = api.node(collection.out(hydra.member).out(rdf.type).terms).out(hyper_query.include)

      const included = await Promise.all([
        loadLinkedResources(collection.out(hydra.member), eagerLoadByCollection, client),
        loadLinkedResources(collection.out(hydra.member), eagerLoadByMembers, client),
      ])

      included.forEach(memberData.addAll)

      return memberData.toStream()
    },
  }
}

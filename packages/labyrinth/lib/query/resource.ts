import $rdf from 'rdf-ext'
import { hyper_query } from '@hydrofoil/vocabularies/builders'
import clownface, { GraphPointer, MultiPointer } from 'clownface'
import express from 'express'
import once from 'once'
import { isGraphPointer } from 'is-graph-pointer'
import { rdf } from '@tpluscode/rdf-ns-builders'
import { DescribeStrategy, DescribeStrategyFactory, unionGraphDescribeStrategy } from '../../describeStrategy'
import { log } from '../logger'
import { loadImplementations } from '../code'

export function loadRepresentation(req: Pick<express.Request, 'hydra' | 'labyrinth'>, defaultStrategyFactory = unionGraphDescribeStrategy) {
  return once(async () => {
    const api = req.hydra.api
    const apiPtr = clownface(api) as GraphPointer
    const resource = await req.hydra.resource.clownface()
    const types = apiPtr.node(resource.out(rdf.type))

    let pointer: MultiPointer = resource.out(hyper_query.describeStrategy)
    if (!isGraphPointer(pointer)) {
      pointer = types.out(hyper_query.describeStrategy)
    }

    let describe: DescribeStrategy
    const [factory] = await loadImplementations<DescribeStrategyFactory<unknown[]>>(pointer, { api, log }, {
      throwWhenLoadFails: true,
      single: true,
    })

    const client = req.labyrinth.sparql
    if (factory) {
      const [impl, args] = factory
      describe = await impl({ api: apiPtr, resource, client }, ...args)
    } else {
      describe = await defaultStrategyFactory({ api: apiPtr, resource, client }, hyper_query.include)
    }

    const dataset = await $rdf.dataset().import(await describe(resource.term))

    return clownface({ dataset, term: req.hydra.resource.term })
  })
}

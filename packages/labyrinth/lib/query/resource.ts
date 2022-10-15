import $rdf from 'rdf-ext'
import { hyper_query } from '@hydrofoil/vocabularies/builders'
import clownface, { GraphPointer } from 'clownface'
import express from 'express'
import once from 'once'
import { isGraphPointer } from 'is-graph-pointer'
import { rdf } from '@tpluscode/rdf-ns-builders'
import { Construct } from '@tpluscode/sparql-builder'
import { DescribeStrategyFactory } from '../../describeStrategy'
import { log } from '../logger'
import { loadImplementations } from '../code'
import { loadResourceWithLinks } from './eagerLinks'

export function loadRepresentation(req: Pick<express.Request, 'hydra' | 'labyrinth'>, defaultStrategy = loadResourceWithLinks) {
  return once(async () => {
    const api = req.hydra.api
    const resource = await req.hydra.resource.clownface()
    const types = resource.out(rdf.type)

    let pointer = resource.out(hyper_query.describeStrategy)
    if (!isGraphPointer(pointer)) {
      pointer = types.out(hyper_query.describeStrategy)
    }

    let construct: Construct
    const [factory] = await loadImplementations<DescribeStrategyFactory<unknown[]>>(pointer, { api, log }, {
      throwWhenLoadFails: true,
      single: true,
    })

    const apiPtr = clownface(api) as GraphPointer
    const client = req.labyrinth.sparql
    if (factory) {
      const [impl, args] = factory
      const strategy = await impl({ api: apiPtr, resource, client }, ...args)
      construct = await strategy(resource.term)
    } else {
      construct = await defaultStrategy([req.hydra.resource.term], types.out(hyper_query.include).toArray())
    }

    const dataset = await $rdf.dataset()
      .import(await construct.execute(req.labyrinth.sparql.query))

    return clownface({ dataset, term: req.hydra.resource.term })
  })
}

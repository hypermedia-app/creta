import $rdf from 'rdf-ext'
import { hyper_query } from '@hydrofoil/vocabularies/builders'
import clownface from 'clownface'
import express from 'express'
import once from 'once'
import { loadResourceWithLinks } from './query/eagerLinks'

export function loadRepresentation(req: Pick<express.Request, 'hydra' | 'labyrinth'>) {
  return once(async () => {
    const types = clownface({
      dataset: req.hydra.api.dataset,
      term: [...req.hydra.resource.types],
    })

    const dataset = await $rdf.dataset()
      .import(await loadResourceWithLinks([req.hydra.resource.term], types.out(hyper_query.include).toArray(), req.labyrinth.sparql))

    return clownface({ dataset, term: req.hydra.resource.term })
  })
}

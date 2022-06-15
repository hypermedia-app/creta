import $rdf from 'rdf-ext'
import { hyper_query } from '@hydrofoil/vocabularies/builders'
import clownface from 'clownface'
import express from 'express'
import { loadResourceWithLinks } from './query/eagerLinks'

export async function loadRepresentation(req: Pick<express.Request, 'hydra' | 'labyrinth'>) {
  const types = clownface({
    dataset: req.hydra.api.dataset,
    term: [...req.hydra.resource.types],
  })

  const dataset = await $rdf.dataset()
    .import(await loadResourceWithLinks([req.hydra.resource.term], types.out(hyper_query.include).toArray(), req.labyrinth.sparql))

  return clownface({ dataset, term: req.hydra.resource.term })
}

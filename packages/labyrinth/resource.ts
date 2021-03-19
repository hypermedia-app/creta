import asyncMiddleware from 'middleware-async'
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import TermSet from '@rdfjs/term-set'
import { query } from './lib/namespace'
import { loadLinkedResources } from './lib/query/eagerLinks'

export const get = asyncMiddleware(async (req, res) => {
  const types = clownface({
    dataset: req.hydra.api.dataset,
    term: [...req.hydra.resource.types],
  })

  let dataset = $rdf.dataset([...await req.hydra.resource.dataset()])
  if (!req.user || !req.user.pointer) {
    const restrictedProperties = new TermSet([...types.out(query.restrict).terms])
    dataset = dataset.filter(quad => !restrictedProperties.has(quad.predicate))
  }

  const pointer = clownface({ dataset, term: req.hydra.resource.term })
  return res.dataset(dataset.merge(await loadLinkedResources(pointer, types.out(query.include).toArray(), req.labyrinth.sparql)))
})

import asyncMiddleware from 'middleware-async'
import clownface from 'clownface'
import { Router } from 'express'
import $rdf from 'rdf-ext'
import TermSet from '@rdfjs/term-set'
import { auth, query } from './lib/namespace'
import { loadLinkedResources } from './lib/query/eagerLinks'
import guard from 'express-jwt-permissions'

const permission = guard()

export function protectedResource(...handlers: any[]) {
  const router = Router()

  router.use((req, res, next) => {
    const typesRestricted = clownface(req.hydra.api)
      .node([...req.hydra.resource.types])
      .out(auth.required)
      .values
      .includes('true')
    const operationRestricted = req.hydra.operation.out(auth.required).value === 'true'
    const authRequired = operationRestricted || typesRestricted
    const permissions = req.hydra.operation
      .out(auth.permissions).toArray()
      .reduce<string[][]>((permissionSets, listPtr) => {
      const permissionList = listPtr.list()
      if (!permissionList) {
        return permissionSets
      }

      return [...permissionSets, [...permissionList].map(p => p.value)]
    }, [])

    if (authRequired || permissions.length > 0) {
      return permission.check(permissions)(req, res, next)
    }

    next()
  })
  router.use(...handlers)

  return router
}

export const get = protectedResource(asyncMiddleware(async (req, res) => {
  const types = clownface({
    dataset: req.hydra.api.dataset,
    term: [...req.hydra.resource.types],
  })

  let dataset = $rdf.dataset([...req.hydra.resource.dataset])
  if (!(req.user && req.user.id)) {
    const restrictedProperties = new TermSet([...types.out(query.restrict).terms])
    dataset = dataset.filter(quad => !restrictedProperties.has(quad.predicate))
  }

  const pointer = clownface({ dataset, term: req.hydra.resource.term })
  return res.dataset(dataset.merge(await loadLinkedResources(pointer, types.out(query.include), req.sparql)))
}))

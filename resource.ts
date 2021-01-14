import asyncMiddleware from 'middleware-async'
import clownface, { GraphPointer } from 'clownface'
import { HydraBox } from 'hydra-box'
import error from 'http-errors'
import { Router } from 'express'
import guard from 'express-jwt-permissions'
import { NamedNode } from 'rdf-js'
import $rdf from 'rdf-ext'
import TermSet from '@rdfjs/term-set'
import { auth, query } from './lib/namespace'
import { loadLinkedResources } from './lib/query/eagerLinks'

const permission = guard()

const scope = guard({
  permissionsProperty: 'scope',
})

function toStringArrays(permissionSets: string[][], listPtr: GraphPointer): string[][] {
  const permissionList = listPtr.list()
  if (!permissionList) {
    return permissionSets
  }

  return [...permissionSets, [...permissionList].map(p => p.value)]
}

function getAuth(hydra: HydraBox, property: NamedNode) {
  const api = clownface(hydra.api)

  const operationRestrictions = hydra.operation
    .out(property).toArray()
    .reduce(toStringArrays, [])

  const typeRestrictions = api.node([...hydra.resource.types])
    .out(property).toArray()
    .reduce(toStringArrays, [])

  return [...operationRestrictions, ...typeRestrictions]
}

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

    const permissions = getAuth(req.hydra, auth.permissions)
    if (permissions.length > 0) {
      return permission.check(permissions)(req, res, next)
    }

    const scopes = getAuth(req.hydra, auth.scopes)
    if (scopes.length > 0) {
      return scope.check(scopes)(req, res, next)
    }

    if (authRequired && !req.user) {
      return next(new error.Unauthorized())
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

  let dataset = $rdf.dataset([...await req.hydra.resource.dataset()])
  if (!req.user || !req.user.id) {
    const restrictedProperties = new TermSet([...types.out(query.restrict).terms])
    dataset = dataset.filter(quad => !restrictedProperties.has(quad.predicate))
  }

  const pointer = clownface({ dataset, term: req.hydra.resource.term })
  return res.dataset(dataset.merge(await loadLinkedResources(pointer, types.out(query.include).toArray(), req.app.sparql)))
}))

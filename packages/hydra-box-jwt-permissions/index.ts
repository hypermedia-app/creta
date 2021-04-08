import asyncMiddleware from 'middleware-async'
import guard from 'express-jwt-permissions'
import clownface, { GraphPointer } from 'clownface'
import error from 'http-errors'
import type { HydraBox } from 'hydra-box'
import { NamedNode } from 'rdf-js'
import { auth } from '@hydrofoil/namespaces'

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

export const authorize = asyncMiddleware((req, res, next) => {
  const api = clownface(req.hydra.api)

  if (!req.hydra.resource) {
    return next()
  }

  const typesRestricted = api
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

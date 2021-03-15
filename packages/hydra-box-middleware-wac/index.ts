import asyncMiddleware from 'middleware-async'
import { ASK } from '@tpluscode/sparql-builder'
import { acl, auth } from '@hydrofoil/labyrinth/lib/namespace'
import error from 'http-errors'
import { NamedNode, Term } from 'rdf-js'
import type { StreamClient } from 'sparql-http-client/StreamClient'
import type * as express from 'express'

interface Check {
  accessMode: Term[] | Term
  client: StreamClient
}

interface ResourceCheck extends Check {
  term: NamedNode
}

interface TypeCheck extends Check {
  types: Term[]
}

export function check({ accessMode, client, ...check }: ResourceCheck | TypeCheck): Promise<boolean> {
  return ASK`
    ?authorization a ${acl.Authorization} ;
                   ${acl.mode} ${accessMode} ; 
                   ${acl.accessTo} ${check.term} .
  `.execute(client.query)
}

export const middleware = (client: StreamClient): express.RequestHandler => asyncMiddleware(async (req, res, next) => {
  const accessMode = req.hydra.operation.out(auth.access).term

  const hasAccess = accessMode && await check({
    term: req.hydra.term,
    accessMode,
    client,
  })

  if (hasAccess) {
    return next()
  }

  return next(new error.Unauthorized())
})

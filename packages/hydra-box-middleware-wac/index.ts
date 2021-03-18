import asyncMiddleware from 'middleware-async'
import { ASK } from '@tpluscode/sparql-builder'
import { auth } from '@hydrofoil/labyrinth/lib/namespace'
import error from 'http-errors'
import { NamedNode, Term } from 'rdf-js'
import type { StreamClient } from 'sparql-http-client/StreamClient'
import type * as express from 'express'
import { acl, foaf, rdf } from '@tpluscode/rdf-ns-builders'
import type { GraphPointer } from 'clownface'

interface Check {
  accessMode: Term[] | Term
  client: StreamClient
  agent?: GraphPointer
}

interface ResourceCheck extends Check {
  term: NamedNode
}

interface TypeCheck extends Check {
  types: Term[]
}

function directAuthorization({ agent, accessMode, term }: Omit<ResourceCheck, 'client'>) {
  const agentClass = agent
    ? [...agent.out(rdf.type).terms, acl.AuthenticatedAgent]
    : []

  return ASK`
    VALUES ?mode { ${acl.Control} ${accessMode} }
    VALUES ?agent { ${agent?.term || '<>'} }
    VALUES ?agentClass { ${foaf.Agent} ${agentClass} }
    
    ${term} a ?type .
    
    {
      ?authorization a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.agentClass} ?agentClass ;
                     ${acl.accessTo} ${term} ;
    }
    union
    {
      ?authorization a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.agent} ?agent ;
                     ${acl.accessTo} ${term} ;
    }
    union
    {
      ?authorization a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.agentClass} ?agentClass ;
                     ${acl.accessToClass} ?type ;
    }
    union
    {
      ?authorization a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.agent} ?agent ;
                     ${acl.accessToClass} ?type ;
    }`
}

function typeAuthorization({ agent, accessMode, types }: Omit<TypeCheck, 'client'>) {
  const agentClass = agent
    ? [...agent.out(rdf.type).terms, acl.AuthenticatedAgent]
    : []

  return ASK`
    VALUES ?mode { ${acl.Control} ${accessMode} }
    VALUES ?type { ${types} }
    VALUES ?agent { ${agent?.term || '<>'} }
    VALUES ?agentClass { ${foaf.Agent} ${agentClass} }
    
    {
      ?authorization a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.agentClass} ?agentClass ;
                     ${acl.accessToClass} ?type ;
    }
    union
    {
      ?authorization a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.agent} ?agent ;
                     ${acl.accessToClass} ?type ;
    }`
}

export async function check({ client, ...check }: ResourceCheck | TypeCheck): Promise<Error | null> {
  let hasAccess
  if ('term' in check) {
    hasAccess = await directAuthorization(check).execute(client.query)
  } else {
    hasAccess = await typeAuthorization(check).execute(client.query)
  }

  return hasAccess ? null : new error.Unauthorized()
}

export const middleware = (client: StreamClient): express.RequestHandler => asyncMiddleware(async (req, res, next) => {
  const accessMode = req.hydra.operation?.out(auth.access).term

  const error = accessMode && await check({
    term: req.hydra.term,
    accessMode,
    client,
    agent: req.user?.pointer,
  })

  if (error) {
    return next(error)
  }

  return next()
})

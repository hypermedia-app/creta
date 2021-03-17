import asyncMiddleware from 'middleware-async'
import { ASK } from '@tpluscode/sparql-builder'
import { auth } from '@hydrofoil/labyrinth/lib/namespace'
import error from 'http-errors'
import { NamedNode, Term } from 'rdf-js'
import type { StreamClient } from 'sparql-http-client/StreamClient'
import type * as express from 'express'
import { acl, foaf } from '@tpluscode/rdf-ns-builders'

interface Check {
  accessMode: Term[] | Term
  client: StreamClient
  agent?: Term
}

interface ResourceCheck extends Check {
  term: NamedNode
}

interface TypeCheck extends Check {
  types: Term[]
}

function directAuthorization({ agent, accessMode, term }: Omit<ResourceCheck, 'client'>) {
  return ASK`
    VALUES ?mode { ${acl.Control} ${accessMode} }
    VALUES ?agent { ${agent || '<>'} }
    
    ${term} a ?type .
    
    {
      ?agent a ?agentClass .
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
                     ${acl.agentClass} ${foaf.Agent} ;
                     ${acl.accessTo} ${term} ;
    }
    union
    {
      ?agent a ?agentClass .
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
    }
    union
    {
      ?authorization a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.agentClass} ${foaf.Agent} ;
                     ${acl.accessToClass} ?type ;
    }`
}

function typeAuthorization({ agent, accessMode, types }: Omit<TypeCheck, 'client'>) {
  return ASK`
    VALUES ?mode { ${acl.Control} ${accessMode} }
    VALUES ?type { ${types} }
    VALUES ?agent { ${agent || '<>'} }
    
    {
      ?agent a ?agentClass .
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
    }
    union
    {
      ?authorization a ${acl.Authorization} ;
                     ${acl.mode} ?mode ;
                     ${acl.agentClass} ${foaf.Agent} ;
                     ${acl.accessToClass} ?type ;
    }`
}

export async function check({ client, ...check }: ResourceCheck | TypeCheck): Promise<Error | null> {
  let hasAccess = false
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
    agent: req.user?.id,
  })

  if (error) {
    return next(error)
  }

  return next()
})

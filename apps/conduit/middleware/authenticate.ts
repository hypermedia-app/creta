import fetch from 'node-fetch'
import express, { Router } from 'express'
import jwt from 'express-jwt'
import jwksRsa from 'jwks-rsa'
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import asyncMiddleware from 'middleware-async'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { vcard } from '@tpluscode/rdf-ns-builders'
import type { StreamClient } from 'sparql-http-client/StreamClient'
import { Authentication } from '@hydrofoil/knossos/server'

declare module 'express-serve-static-core' {
  interface Request {
    user: {
      sub?: string
    }
  }
}

const setUser = (client: StreamClient): express.RequestHandler => async (req, res, next) => {
  if (req.user?.sub) {
    const userQuery = await DESCRIBE`?user`
      .WHERE`?user ${vcard.hasUID} "${req.user.sub}"`
      .execute(client.query)
    const dataset = await $rdf.dataset().import(userQuery)

    const foundUser = clownface({ dataset })
      .has(vcard.hasUID, req.user.sub)
      .toArray()[0] as any

    req.agent = foundUser || clownface({ dataset: $rdf.dataset() })
      .namedNode(`urn:user:${req.user.sub}`)
      .addOut(vcard.hasUID, req.user.sub)
  }

  next()
}

const createJwtHandler = (jwksUri: string, client: StreamClient) => {
  const authorize = jwt({
    // Dynamically provide a signing key
    // based on the kid in the header and
    // the signing keys provided by the JWKS endpoint.
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri,
    }),

    // Validate the audience and the issuer.
    audience: process.env.AUTH_AUDIENCE,
    issuer: process.env.AUTH_ISSUER,
    algorithms: ['RS256'],
    credentialsRequired: false,
  })

  return Router().use(authorize).use(asyncMiddleware(setUser(client)))
}

const authentication: Authentication = async ({ client }: { client: StreamClient }): Promise<express.RequestHandler> => {
  if (process.env.AUTH_JWKS_URI) {
    return createJwtHandler(process.env.AUTH_JWKS_URI, client)
  }

  const response = await fetch(`${process.env.AUTH_ISSUER}/.well-known/openid-configuration`)

  if (response.ok) {
    const oidcConfig = await response.json()
    return createJwtHandler(oidcConfig.jwks_uri, client)
  }

  throw new Error('Failed to initialize authentication middleware')
}

export default authentication

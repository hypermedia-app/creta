import fetch from 'node-fetch'
import express, { Router } from 'express'
import jwt from 'express-jwt'
import jwksRsa from 'jwks-rsa'
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import asyncMiddleware from 'middleware-async'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { vcard } from '@tpluscode/rdf-ns-builders'

declare module '@hydrofoil/labyrinth' {
  interface User {
    sub?: string
  }
}

const setUser: express.RequestHandler = async (req, res, next) => {
  if (req.user?.sub) {
    const userQuery = await DESCRIBE`?user`
      .WHERE`?user ${vcard.hasUID} "${req.user.sub}"`
      .execute(req.labyrinth.sparql.query)
    const dataset = await $rdf.dataset().import(userQuery)

    req.user.pointer = clownface({ dataset })
      .has(vcard.hasUID, req.user.sub)
      .toArray()[0]
  }

  next()
}

const createJwtHandler = (jwksUri: string) => {
  const authorize = jwt({
    // Dynamically provide a signing key
    // based on the kid in the header and
    // the signing keys provided by the JWKS endpoint.
    secret: jwksRsa.expressJwtSecret({
      cache: false,
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

  return Router().use(authorize).use(asyncMiddleware(setUser))
}

export default async function authentication(): Promise<express.RequestHandler> {
  if (process.env.AUTH_JWKS_URI) {
    return createJwtHandler(process.env.AUTH_JWKS_URI)
  }

  const response = await fetch(`${process.env.AUTH_ISSUER}/.well-known/openid-configuration`)

  if (response.ok) {
    const oidcConfig = await response.json()
    return createJwtHandler(oidcConfig.jwks_uri)
  }

  throw new Error('Failed to initialize authentication middleware')
}

import express from 'express'
import { nanoid } from 'nanoid'
import { Debugger } from 'debug'
import error from 'http-errors'
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import { rdf } from '@tpluscode/rdf-ns-builders'
import { knossos } from '@hydrofoil/vocabularies/builders/strict'

interface SystemAuth {
  log: Debugger
  name: string
  systemAuthKey?: string
}

const systemAuthPattern = /^System (.+)$/

export const systemAuth = ({ log, name, systemAuthKey = nanoid() }: SystemAuth): express.RequestHandler => {
  log('System account authentication token: %s', systemAuthKey)

  return (req, res, next) => {
    const tokenMatches = req.headers.authorization?.match(systemAuthPattern)

    if (tokenMatches?.length) {
      const token = tokenMatches[1]
      if (token !== systemAuthKey) {
        return next(new error.Forbidden('Invalid system token'))
      }

      req.agent = clownface({ dataset: $rdf.dataset() })
        .namedNode(`${knossos.System.value}:${name}`)
        .addOut(rdf.type, knossos.SystemAccount)

      log('Authenticated system user %s', req.agent.value)
    }

    next()
  }
}

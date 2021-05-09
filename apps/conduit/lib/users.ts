import express from 'express'
import httpError from 'http-errors'

export const currentUser: express.RequestHandler = async (req, res, next) => {
  if (!req.agent) {
    return next(new httpError.Unauthorized())
  }

  return res.redirect(req.agent.term.value)
}

import { Term } from 'rdf-js'
import { RequestHandler } from 'express'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import TermMap from '@rdfjs/term-map'
import { PotentialOperation } from 'hydra-box'
import { log } from '../logger'

function isHydraType(type: Term) {
  return type.value.startsWith(hydra().value)
}

export const removeHydraOperations: RequestHandler = (req, res, next) => {
  if (req.hydra.operations.length < 2) {
    return next()
  }

  const defaultOperations = new TermMap<Term, PotentialOperation[]>()
  const userOperations = new TermMap<Term, PotentialOperation[]>()
  ;[...req.hydra.operations].forEach((value) => {
    if (value.operation.in(hydra.supportedOperation).terms.some(isHydraType)) {
      defaultOperations.get(value.resource.term)?.push(value) || defaultOperations.set(value.resource.term, [value])
    } else {
      userOperations.get(value.resource.term)?.push(value) || userOperations.set(value.resource.term, [value])
    }
  })

  for (const [term, operations] of defaultOperations) {
    if (userOperations.has(term)) {
      for (const operation of operations) {
        if (log.enabled) {
          const method = operation.operation.out(hydra.method).value
          const types = operation.operation.out(rdf.type).values
          const clas = operation.operation.in(hydra.supportedOperation).values
          log('Removing %s operation %o supported by %o', method, types, clas)
        }
        req.hydra.operations.splice(req.hydra.operations.indexOf(operation), 1)
      }
    }
  }

  next()
}

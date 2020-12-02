import { RequestHandler } from 'express'
import { hydra } from '@tpluscode/rdf-ns-builders'
import { Term } from 'rdf-js'
import TermMap from '@rdfjs/term-map'
import { PotentialOperation } from 'hydra-box'

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
        req.hydra.operations.splice(req.hydra.operations.indexOf(operation), 1)
      }
    }
  }

  next()
}

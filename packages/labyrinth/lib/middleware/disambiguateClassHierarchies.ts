/**
 * @packageDocumentation
 * @module @hydrofoil/labyrinth/lib/middleware/disambiguateClassHierarchies
 */

import { RequestHandler } from 'express'
import { PotentialOperation } from 'hydra-box'
import { hydra, rdfs } from '@tpluscode/rdf-ns-builders'

/**
 * hydra-box operation middleware which removes conflicting operations within type hierarchies.
 *
 * If there are multiple operations found which are supported by a class and its subclass, only the operations supported by
 * most specific classes will be selected.
 *
 * A common case will be `hydra:Collection` which is a subclass of `hydra:Resource`. If both were to support a GET operation,
 * the collection will win.
 */
export const disambiguateClassHierarchies: RequestHandler = (req, res, next) => {
  const { operations } = req.hydra

  if (operations.length < 2) {
    return next()
  }

  function moreSpecificOperationExists({ operation }: PotentialOperation) {
    const types = operation.in(hydra.supportedOperation).terms

    return operations.some(other => other.operation
      .in(hydra.supportedOperation)
      .has(rdfs.subClassOf, types).terms.length > 0)
  }

  req.hydra.operations = operations
    .reduce((operations, operation) => {
      if (moreSpecificOperationExists(operation)) {
        return operations
      }

      return [...operations, operation]
    }, [] as PotentialOperation[])

  next()
}

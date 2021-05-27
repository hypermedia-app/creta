import { describe, it } from 'mocha'
import express from 'express'
import $rdf from 'rdf-ext'
import * as ns from '@tpluscode/rdf-ns-builders'
import request from 'supertest'
import { Resource } from 'hydra-box'
import clownface from 'clownface'
import { hydraBox } from '@labyrinth/testing/hydra-box'
import { ex } from '@labyrinth/testing/namespace'
import { removeHydraOperations } from '../../../lib/middleware'

describe('@hydrofoil/labyrinth/lib/middleware/removeHydraOperations', () => {
  const resource: Resource = {
    prefetchDataset: $rdf.dataset(),
    dataset: async () => $rdf.dataset(),
    quadStream() {
      return $rdf.dataset().toStream()
    },
    term: ex.resource,
    types: new Set(),
  }

  it('removes hydra:Resource operation if another exists', async () => {
    // given
    const app = express()
    app.use(hydraBox({
      setup: hydra => {
        const api = clownface({ dataset: $rdf.dataset() })
          .node(ex.HydraOperation)
          .addIn(ns.hydra.supportedOperation, ns.hydra.Resource)
          .node(ex.UserOperation)
          .addIn(ns.hydra.supportedOperation, ex.Resource)

        hydra.operations.push({
          resource,
          operation: api.node(ex.UserOperation),
        }, {
          resource,
          operation: api.node(ex.HydraOperation),
        })
      },
    }))
    app.use(removeHydraOperations)
    app.use((req, res) => {
      res.send(req.hydra.operations.map(({ operation }) => operation.term.value))
    })

    // when
    const response = request(app).get('/')

    // then
    await response.expect([
      ex.UserOperation.value,
    ])
  })

  it('removes hydra:Resource operation if another exists (reverse order)', async () => {
    // given
    const app = express()
    app.use(hydraBox({
      setup: hydra => {
        const api = clownface({ dataset: $rdf.dataset() })
          .node(ex.HydraOperation)
          .addIn(ns.hydra.supportedOperation, ns.hydra.Resource)
          .node(ex.UserOperation)
          .addIn(ns.hydra.supportedOperation, ex.Resource)

        hydra.operations.push({
          resource,
          operation: api.node(ex.HydraOperation),
        }, {
          resource,
          operation: api.node(ex.UserOperation),
        })
      },
    }))
    app.use(removeHydraOperations)
    app.use((req, res) => {
      res.send(req.hydra.operations.map(({ operation }) => operation.term.value))
    })

    // when
    const response = request(app).get('/')

    // then
    await response.expect([
      ex.UserOperation.value,
    ])
  })

  it('does not remove hydra:Resource operation if it is the only one', async () => {
    // given
    const app = express()
    app.use(hydraBox({
      setup: hydra => {
        const api = clownface({ dataset: $rdf.dataset() })
          .node(ex.HydraOperation)
          .addIn(ns.hydra.supportedOperation, ns.hydra.Resource)

        hydra.operations.push({
          resource,
          operation: api.node(ex.HydraOperation),
        })
      },
    }))
    app.use(removeHydraOperations)
    app.use((req, res) => {
      res.send(req.hydra.operations.map(({ operation }) => operation.term.value))
    })

    // when
    const response = request(app).get('/')

    // then
    await response.expect([
      ex.HydraOperation.value,
    ])
  })
})

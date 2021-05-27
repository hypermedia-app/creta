import { describe, it } from 'mocha'
import { Resource } from 'hydra-box'
import $rdf from 'rdf-ext'
import { ex } from '@labyrinth/testing/namespace'
import express from 'express'
import { hydraBox } from '@labyrinth/testing/hydra-box'
import clownface from 'clownface'
import * as ns from '@tpluscode/rdf-ns-builders'
import request from 'supertest'
import { disambiguateClassHierarchies } from '../../../lib/middleware'

describe('@hydrofoil/labyrinth/lib/middleware/disambiguateClassHierarchies', () => {
  const resource: Resource = {
    prefetchDataset: $rdf.dataset(),
    dataset: async () => $rdf.dataset(),
    quadStream() {
      return $rdf.dataset().toStream()
    },
    term: ex.resource,
    types: new Set(),
  }

  it('removes operations of base class if another is found supported by child class', async () => {
    // given
    const app = express()
    app.use(hydraBox({
      setup: hydra => {
        const api = clownface({ dataset: $rdf.dataset() })
          .node(ex.GetResource)
          .addIn(ns.hydra.supportedOperation, ns.hydra.Resource)
          .node(ex.GetCollection)
          .addIn(ns.hydra.supportedOperation, ns.hydra.Collection)
          .node(ns.hydra.Collection)
          .addOut(ns.rdfs.subClassOf, ns.hydra.Resource)

        hydra.operations.push({
          resource,
          operation: api.node(ex.GetResource),
        }, {
          resource,
          operation: api.node(ex.GetCollection),
        })
      },
    }))
    app.use(disambiguateClassHierarchies)
    app.use((req, res) => {
      res.send(req.hydra.operations.map(({ operation }) => operation.term.value))
    })

    // when
    const response = request(app).get('/')

    // then
    await response.expect([
      ex.GetCollection.value,
    ])
  })

  it('does not remove operations which are supported by unrelated classes', async () => {
    // given
    const app = express()
    app.use(hydraBox({
      setup: hydra => {
        const api = clownface({ dataset: $rdf.dataset() })
          .node(ex.GetResource)
          .addIn(ns.hydra.supportedOperation, ns.hydra.Resource)
          .node(ex.GetPerson)
          .addIn(ns.hydra.supportedOperation, ns.schema.Person)

        hydra.operations.push({
          resource,
          operation: api.node(ex.GetResource),
        }, {
          resource,
          operation: api.node(ex.GetPerson),
        })
      },
    }))
    app.use(disambiguateClassHierarchies)
    app.use((req, res) => {
      res.send(req.hydra.operations.map(({ operation }) => operation.term.value))
    })

    // when
    const response = request(app).get('/')

    // then
    await response.expect([
      ex.GetResource.value,
      ex.GetPerson.value,
    ])
  })

  it('keeps all operations of bottom class in hierarchy', async () => {
    // given
    const app = express()
    app.use(hydraBox({
      setup: hydra => {
        const api = clownface({ dataset: $rdf.dataset() })
          .node(ex.GetResource)
          .addIn(ns.hydra.supportedOperation, ns.hydra.Resource)
          .node(ex.GetCollection)
          .addIn(ns.hydra.supportedOperation, ns.hydra.Collection)
          .node(ex.AlsoGetCollection)
          .addIn(ns.hydra.supportedOperation, ns.hydra.Collection)
          .node(ns.hydra.Collection)
          .addOut(ns.rdfs.subClassOf, ns.hydra.Resource)

        hydra.operations.push({
          resource,
          operation: api.node(ex.GetResource),
        }, {
          resource,
          operation: api.node(ex.GetCollection),
        }, {
          resource,
          operation: api.node(ex.AlsoGetCollection),
        })
      },
    }))
    app.use(disambiguateClassHierarchies)
    app.use((req, res) => {
      res.send(req.hydra.operations.map(({ operation }) => operation.term.value))
    })

    // when
    const response = request(app).get('/')

    // then
    await response.expect([
      ex.GetCollection.value,
      ex.AlsoGetCollection.value,
    ])
  })
})

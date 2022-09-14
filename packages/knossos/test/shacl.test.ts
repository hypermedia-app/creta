import { NamedNode, Term } from 'rdf-js'
import express from 'express'
import request from 'supertest'
import { turtle } from '@tpluscode/rdf-string'
import TermSet from '@rdfjs/term-set'
import { foaf, schema } from '@tpluscode/rdf-ns-builders'
import sinon from 'sinon'
import DatasetExt from 'rdf-ext/lib/Dataset'
import $rdf from 'rdf-ext'
import clownface, { AnyContext } from 'clownface'
import { expect } from 'chai'
import { ex } from '@labyrinth/testing/namespace'
import { blankNode } from '@labyrinth/testing/nodeFactory'
import { shaclValidate } from '../shacl'
import * as shacl from '../lib/shacl'

function ok(req: express.Request, res: express.Response) {
  res.sendStatus(200)
}

describe('@hydrofoil/knossos/shacl', () => {
  const sparql = {}
  let app: express.Express
  let resourceTypes: Set<NamedNode>
  let shapesGraph: clownface.AnyPointer<AnyContext, DatasetExt>

  beforeEach(() => {
    resourceTypes = new TermSet()

    shapesGraph = clownface({ dataset: $rdf.dataset() })

    app = express()
    app.use((req, res, next) => {
      req.hydra = {
        api: {
          term: ex.api,
        },
        resource: {
          types: resourceTypes,
        },
      } as any
      req.labyrinth = {
        sparql,
      } as any
      req.knossos = {
        config: blankNode(),
      } as any

      sinon.stub(shacl, 'shapesQuery').callsFake(async () => shapesGraph.dataset.toStream())

      next()
    })
  })

  afterEach(() => {
    sinon.restore()
  })

  it('loads shapes for the sum of resource types and payload types', async () => {
    // given
    resourceTypes.add(foaf.Agent)
    app.post('*', shaclValidate(), ok)

    // when
    await request(app)
      .post('/')
      .send(turtle`<> a ${foaf.Person} .`.toString())
      .set('content-type', 'text/turtle')

    // then
    expect(shacl.shapesQuery).to.have.been.calledWith(sinon.match({
      types: sinon.match((types: Term[]) => types.every(t => t.equals(foaf.Agent) || t.equals(foaf.Person))),
      sparql,
    }))
  })

  it('loads shapes for custom types', async () => {
    // given
    resourceTypes.add(foaf.Agent)
    app.post('*', shaclValidate({
      typesToValidate() {
        return [foaf.Person, schema.Person]
      },
    }), ok)

    // when
    await request(app)
      .post('/')
      .send(turtle`<> a ${foaf.Person} .`.toString())
      .set('content-type', 'text/turtle')

    // then
    expect(shacl.shapesQuery).to.have.been.calledWith(sinon.match({
      types: sinon.match((types: Term[]) => types.every(t => t.equals(schema.Person) || t.equals(foaf.Person))),
      sparql,
    }))
  })

  describe('shapesQuery overrides', () => {
    it('uses query provided by custom function', async () => {
      // given
      const shapesQuery = sinon.stub().returns($rdf.dataset().toStream())
      app.use((req, res, next) => {
        res.locals.shapesQuery = shapesQuery
        next()
      })
      app.post('*', shaclValidate(), ok)

      // when
      await request(app)
        .post('/')
        .send(turtle`<> a ${foaf.Person} .`.toString())
        .set('content-type', 'text/turtle')

      // then
      expect(shacl.shapesQuery).not.to.have.been.called
      expect(shapesQuery).to.have.been.called
    })
  })
})

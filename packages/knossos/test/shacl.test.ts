import { NamedNode, Term } from 'rdf-js'
import express from 'express'
import request from 'supertest'
import { turtle } from '@tpluscode/rdf-string'
import TermSet from '@rdfjs/term-set'
import { foaf, rdf, rdfs, sh } from '@tpluscode/rdf-ns-builders'
import sinon from 'sinon'
import DatasetExt from 'rdf-ext/lib/Dataset'
import $rdf from 'rdf-ext'
import clownface, { AnyContext } from 'clownface'
import { expect } from 'chai'
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
        resource: {
          types: resourceTypes,
        },
      } as any
      req.labyrinth = {
        sparql,
      } as any

      sinon.stub(shacl, 'shapesQuery').callsFake(async () => shapesGraph.dataset.toStream())

      next()
    })
  })

  afterEach(() => {
    sinon.restore()
  })

  it.skip('validates resource using hierarchy of shapes', async () => {
    // given
    shapesGraph.node(foaf.Person)
      .addOut(rdfs.subClassOf, foaf.Agent)
      .addOut(rdf.type, [rdfs.Class, sh.NodeShape])
      .node(foaf.Agent)
      .addOut(rdf.type, [rdfs.Class, sh.NodeShape])
      .addOut(sh.property, property => {
        property
          .addOut(sh.path, foaf.name)
          .addOut(sh.minCount, 1)
      })
    app.post('*', shaclValidate, ok)

    // when
    const response = request(app)
      .post('/')
      .send(turtle`<> a ${foaf.Person} .`.toString())
      .set('content-type', 'text/turtle')

    // then
    await response.expect(400)
      .expect(res => {
        expect(res.text).to.contain('MinCount')
      })
  })

  it('loads shapes for the sum of resource types and payload types', async () => {
    // given
    resourceTypes.add(foaf.Agent)
    app.post('*', shaclValidate, ok)

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
})

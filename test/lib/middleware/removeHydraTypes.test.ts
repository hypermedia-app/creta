import { describe, it } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import cf from 'clownface'
import { NamedNode } from 'rdf-js'
import * as ns from '@tpluscode/rdf-ns-builders'
import request from 'supertest'
import { hydraBox } from '../../support/hydra-box'
import { removeHydraTypes } from '../../../lib/middleware'
import { ex } from '../../support/namespace'

describe('labyrinth/lib/middleware/removeHydraTypes', () => {
  it('removes hydra:Resource when resource supports GET from another supported class', async () => {
    // given
    const app = express()
    app.use(hydraBox({
      setup: hydra => {
        hydra.resource.types.add(ns.hydra.Resource).add(ex.Person)
        cf(hydra.resource).addOut(ns.rdf.type, [ns.hydra.Resource, ex.Person])
        cf(hydra.api).addOut(ns.hydra.supportedClass, ex.Person, clas => {
          clas.addOut(ns.hydra.supportedOperation, op => {
            op.addOut(ns.hydra.method, 'GET')
          })
        })
      },
    }))
    app.use(removeHydraTypes)
    let types: NamedNode[] = []
    app.use((req: any, res, next) => {
      types = [...req.hydra.resource.types]
      next()
    })

    // when
    await request(app).get('/')

    // then
    expect(types).to.deep.eq([ex.Person])
  })
})

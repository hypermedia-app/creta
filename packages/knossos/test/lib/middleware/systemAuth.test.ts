import express from 'express'
import sinon from 'sinon'
import request from 'supertest'
import httpStatus from 'http-status'
import RdfResource from '@tpluscode/rdfine'
import { expect } from 'chai'
import { systemAuth } from '../../../lib/middleware/systemAuth'
import { knossos } from '../../../lib/namespace'

describe('@hydrofoil/knossos/lib/middleware/systemAuth', () => {
  const log: any = sinon.spy()
  let app: express.Express

  beforeEach(() => {
    app = express()
  })

  it('sets agent when auth key matches', async () => {
    // given
    app.use(systemAuth({ log, name: 'foo', systemAuthKey: 'foo' }))
    app.use((req, res) => {
      const resource = RdfResource.factory.createEntity(req.agent!)

      return res.send(resource.toJSON())
    })

    // when
    const response = request(app)
      .get('/')
      .set('Authorization', 'System foo')

    // then
    await response.expect(res => {
      expect(res.body).to.have.property('id').match(/foo$/)
      expect(res.body).to.have.property('type').contain(knossos.SystemAccount.value)
    })
  })

  it('responds 403 when key does not match', async () => {
    // given
    app.use(systemAuth({ log, name: 'foo' }))
    app.use((req, res) => res.send(req.agent?.value))

    // when
    const response = request(app)
      .get('/')
      .set('Authorization', 'System foo')

    // then
    await response.expect(httpStatus.FORBIDDEN)
  })
})

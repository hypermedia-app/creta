import { describe, it } from 'mocha'
import { expect } from 'chai'
import path from 'path'
import createApi from '../../lib/api'

describe('lib', () => {
  const apiPath = path.resolve(__dirname, '../test-api')

  it('defaults to /api path for ApiDocumentation', async () => {
    // when
    const api = await createApi({
    })({
      codePath: 'lib',
    })

    // then
    expect(api.path).to.equal('/api')
  })

  it('allows changing path of ApiDocumentation', async () => {
    // when
    const api = await createApi({
      path: '/doc',
    })

    // then
    expect(api.path).to.equal('/doc')
  })
})

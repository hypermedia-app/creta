import { describe, it } from 'mocha'
import { expect } from 'chai'
import path from 'path'
import { createApi } from '../../lib'

describe('lib', () => {
  const apiPath = path.resolve(__dirname, '../test-api')

  it('defaults to /api path for ApiDocumentation', async () => {
    // when
    const api = await createApi({
      apiPath,
      baseUri: 'http://example.com/',
      codePath: 'lib',
    })

    // then
    expect(api.path).to.equal('/api')
  })

  it('allows changing path of ApiDocumentation', async () => {
    // when
    const api = await createApi({
      apiPath,
      baseUri: 'http://example.com/',
      codePath: 'lib',
      path: '/doc',
    })

    // then
    expect(api.path).to.equal('/doc')
  })
})

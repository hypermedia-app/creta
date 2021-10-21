import { resolve } from 'path'
import { expect } from 'chai'
import namespace from '@rdfjs/namespace'
import { Api } from 'hydra-box/Api'
import { fromFilesystem } from '../index'

const ex = namespace('http://example.com/api/')

describe('@hydrofoil/minotaur', () => {
  const codePath = './lib'
  const path = '/api'
  let api: Api

  beforeEach(async () => {
    api = await fromFilesystem({
      apiPath: resolve(__dirname, './api'),
      baseUri: {
        default: 'http://todo.com/',
        replaced: 'http://example.com/',
      },
      codePath,
      path,
    })

    await api.init()
  })

  it('loads turtle files recursively', async () => {
    const todoItem = api.dataset.match(ex.TodoItem)
    expect(todoItem.size).to.be.greaterThan(0)
  })

  it('replaces base URL in parsed contents', async () => {
    const todoItem = api.dataset.match(ex.TodoList)
    expect(todoItem.size).to.be.greaterThan(0)
  })

  it('throws when no turtle file were found', async () => {
    // given
    const api = fromFilesystem({
      apiPath: resolve(__dirname, './api/not-ttl'),
      codePath,
      path,
    })

    // then
    await expect(api).to.eventually.be.rejected
  })
})

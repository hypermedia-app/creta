import { NamedNode } from 'rdf-js'
import fetch from 'node-fetch'
import { log } from './log'

interface DeleteApi {
  token?: string
  apiUri: NamedNode
}

export async function deleteApi({ apiUri, token } : DeleteApi) {
  if (token) {
    const res = await fetch(apiUri.value, {
      method: 'DELETE',
      headers: {
        Authorization: `System ${token}`,
      },
    })

    if (res.ok) {
      log('Reset hydra:ApiDocumentation')
    } else {
      log('Failed to reset hydra:ApiDocumentation: %s', await res.text())
    }
  } else {
    log('No System token provided. API restart may be necessary for changes to be applied')
  }
}

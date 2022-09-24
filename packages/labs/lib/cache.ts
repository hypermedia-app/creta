import type { Request } from 'express'
import fetch from 'node-fetch'

export function fetchHead(_fetch = fetch) {
  return async (req: Request) => {
    const headers: HeadersInit = {}
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization
    }
    if (req.headers.accept) {
      headers.Accept = req.headers.accept
    }
    if (req.method !== 'GET') {
      headers.Prefer = 'return=minimal'
    }
    const res = await _fetch(req.hydra.term.value, {
      method: 'HEAD',
      headers,
    })

    return {
      etag: res.headers.get('etag'),
      lastModified: res.headers.get('last-modified'),
    }
  }
}

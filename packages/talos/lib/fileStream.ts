import fs from 'fs'
import { Readable } from 'stream'
import path from 'path'
import * as mime from 'mime-types'
import replaceStream from 'replacestream'
import { parsers } from '@rdfjs/formats-common'
import isAbsoluteUrl from 'is-absolute-url'
import { log } from './log'

function replacer(basePath: string, resourceUrl: string, s: string, e = s) {
  return (_: unknown, match: string) => {
    let absolute: string
    if (isAbsoluteUrl(match)) {
      return `${s}${match}${e}`
    }

    if (match.startsWith('/') && basePath !== '/') {
      absolute = basePath + match
    } else {
      absolute = new URL(match, resourceUrl).toString()
      if (!match.endsWith('/')) {
        absolute = absolute.replace(/\/?$/, '')
      }
    }

    const absoluteUrl = new URL(absolute, resourceUrl)
    if (absoluteUrl.pathname === '/' && basePath !== '/') {
      absoluteUrl.pathname = basePath
      absolute = absoluteUrl.toString()
    }

    return `${s}${absolute}${e}`
  }
}

const angleBracketTransform = (basePath: string, resourceUrl: string) => replaceStream(/<([^>]+)>(?=([^"\\]*(\\.|"([^"\\]*\\.)*[^"\\]*"))*[^"]*$)/g, replacer(basePath, resourceUrl, '<', '>'))
const jsonTransform = (basePath: string, resourceUrl: string) => replaceStream(/"([./][^"]+)"/g, replacer(basePath, resourceUrl, '"'))

const filePatchTransforms = new Map([
  ['text/turtle', angleBracketTransform],
  ['application/n-triples', angleBracketTransform],
  ['application/n-quads', angleBracketTransform],
  ['application/trig', angleBracketTransform],
  ['application/ld+json', jsonTransform],
])

export function getPatchedStream(file: string, cwd: string, api: string, resourceUrl: string): Readable | null {
  const relative = path.relative(cwd, file)
  const basePath = new URL(api).pathname
  const mediaType = mime.lookup(file)
  if (!mediaType) {
    log('Could not determine media type for file %s', relative)
    return null
  }

  let fileStream = fs.createReadStream(file)
  if (filePatchTransforms.has(mediaType)) {
    fileStream = fileStream.pipe(filePatchTransforms.get(mediaType)!(basePath, resourceUrl))
  }
  const parserStream: Readable | null = parsers.import(mediaType, fileStream, {
    baseIRI: resourceUrl,
  }) as any

  if (!parserStream) {
    log('Unsupported media type %s from %s', mediaType, relative)
  }

  return parserStream
}

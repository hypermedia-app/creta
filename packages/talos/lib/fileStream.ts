import fs from 'fs'
import { Readable } from 'stream'
import path from 'path'
import * as mime from 'mime-types'
import replaceStream from 'replacestream'
import { parsers } from '@rdfjs/formats-common'
import { log } from './log'

const angleBracketTransform = (basePath: string) => replaceStream(/<\/([^>]+)>/g, `<${basePath}/$1>`)
const jsonTransform = (basePath: string) => replaceStream(/"\/([^"]+)"/g, `"${basePath}/$1"`)

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
  if (basePath !== '/' && filePatchTransforms.has(mediaType)) {
    fileStream = fileStream.pipe(filePatchTransforms.get(mediaType)!(basePath))
  }
  const parserStream: Readable | null = parsers.import(mediaType, fileStream, {
    baseIRI: resourceUrl,
  }) as any

  if (!parserStream) {
    log('Unsupported media type %s from %s', mediaType, relative)
  }

  return parserStream
}

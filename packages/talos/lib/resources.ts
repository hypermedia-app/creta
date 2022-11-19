import path from 'path'
import fs from 'fs'
import { NamedNode } from 'rdf-js'
import walk from '@fcostarodrigo/walk'
import $rdf from 'rdf-ext'
import type DatasetExt from 'rdf-ext/lib/Dataset'
import TermSet from '@rdfjs/term-set'
import clownface from 'clownface'
import { deleteMatch } from 'rdf-dataset-ext'
import { log, debug } from './log'
import { getPatchedStream } from './fileStream'
import { optionsFromPrefixes } from './prefixHandler'
import { talosNs } from './ns'

interface ResourceOptions {
  existingResource: 'merge' | 'overwrite' | 'skip'
  environmentRepresentation: 'default' | 'replace'
}

export async function fromDirectories(directories: string[], api: string): Promise<DatasetExt> {
  const validDirs = directories.filter(isValidDir)
  return validDirs.reduce(toGraphs(api), Promise.resolve($rdf.dataset()))
}

function toGraphs(api: string) {
  return async function (previousPromise: Promise<DatasetExt>, dir: string): Promise<DatasetExt> {
    let previous = await previousPromise
    const dataset = $rdf.dataset()

    debug('Processing dir %s', dir)

    for await (const file of walk(dir)) {
      const relative = path.relative(dir, file)
      const resourcePath = path.relative(dir, file)
        .replace(/\.[^.]+$/, '')
        .replace(/\/?index$/, '')

      const url = resourcePath === ''
        ? encodeURI(api)
        : encodeURI(`${api}/${resourcePath}`)

      const parserStream = getPatchedStream(file, dir, api, url)
      if (!parserStream) {
        continue
      }

      debug('Parsing %s', relative)
      const parsedResourceOptions: Partial<ResourceOptions> = { }
      parserStream.on('prefix', optionsFromPrefixes(parsedResourceOptions))

      const resources = new TermSet<NamedNode>()
      const resourceOptions = clownface({ dataset: previous, graph: talosNs.resources })
      try {
        for await (const { subject, predicate, object, ...quad } of parserStream) {
          const graph: NamedNode = quad.graph.equals($rdf.defaultGraph()) ? $rdf.namedNode(url) : quad.graph

          if (!resources.has(graph)) {
            debug('Parsed resource %s', graph.value)
          }
          resources.add(graph)
          dataset.add($rdf.quad(subject, predicate, object, graph))
        }
      } catch (e: any) {
        log('Failed to parse %s: %s', relative, e.message)
      }

      resources.forEach(id => {
        const action = parsedResourceOptions.existingResource || 'default'
        const environmentRepresentation = parsedResourceOptions.environmentRepresentation || 'default'
        const options = resourceOptions.node(id)
        options
          .deleteOut(talosNs.action, talosNs.default)
          .addOut(talosNs.action, talosNs(action))
          .deleteOut(talosNs.environmentRepresentation, talosNs.default)
          .addOut(talosNs.environmentRepresentation, talosNs(environmentRepresentation))

        if (options.has(talosNs.environmentRepresentation, talosNs.replace).terms.length) {
          previous = deleteMatch(previous, undefined, undefined, undefined, id)
        }
      })
    }

    previous.addAll(dataset)
    return previous
  }
}

function isValidDir(dir: string) {
  if (!fs.existsSync(dir)) {
    log('Skipping path %s which does not exist', dir)
    return false
  }
  if (!fs.statSync(dir).isDirectory()) {
    log('Skipping path %s which is not a directory', dir)
    return false
  }

  return true
}

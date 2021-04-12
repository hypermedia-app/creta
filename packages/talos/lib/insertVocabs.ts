import { Quad } from 'rdf-js'
import StreamClient, { StreamClientOptions } from 'sparql-http-client'
import { prefixes, vocabularies } from '@zazuko/rdf-vocabularies'
import { INSERT } from '@tpluscode/sparql-builder'
import { sparql } from '@tpluscode/rdf-string'
import $rdf from 'rdf-ext'
import DatasetExt from 'rdf-ext/lib/Dataset'

function toTriple({ subject, predicate, object }: Quad) {
  return $rdf.triple(subject, predicate, object)
}

function insertVocab(client: StreamClient) {
  return ([prefix, vocab]: [string, DatasetExt]): Promise<void> => {
    const namespace = $rdf.namedNode(prefixes[prefix])

    const insert = INSERT.DATA`GRAPH <${namespace.value}> {
  ${vocab.map(toTriple).toString()}
}`
    const query = sparql`DROP SILENT GRAPH <${namespace.value}>;\n${insert}`.toString()

    return client.query.update(query)
  }
}

export async function insertVocabs(options: StreamClientOptions): Promise<void> {
  const client = new StreamClient(options)

  const datasets = await vocabularies({ only: ['hydra', 'acl', 'as'] })

  await Promise.all(Object.entries(datasets).map(insertVocab(client)))
}

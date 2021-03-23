import { NamedNode, Term } from 'rdf-js'
import $rdf from 'rdf-ext'
import { PropertyResource, Resource, ResourceLoader } from 'hydra-box'
import { CONSTRUCT, SELECT } from '@tpluscode/sparql-builder'
import debug from 'debug'
import ParsingClient from 'sparql-http-client/ParsingClient'
import StreamClient from 'sparql-http-client/StreamClient'
import once from 'once'
import TermMap from '@rdfjs/term-map'
import TermSet from '@rdfjs/term-set'
import { rdf } from '@tpluscode/rdf-ns-builders'
import { PassThrough } from 'stream'

const log = debug('hydra:store')

function onlyNamedNodes(nodes: Set<NamedNode>, term: Term): Set<NamedNode> {
  if (term.termType === 'NamedNode') {
    return nodes.add(term)
  }
  return nodes
}

export class SparqlQueryLoader implements ResourceLoader {
  private readonly __client: ParsingClient
  private readonly __streamClient: StreamClient

  public constructor({ endpointUrl, password, user }: { endpointUrl: string; user?: string; password?: string }) {
    this.__client = new ParsingClient({
      endpointUrl,
      password,
      user,
    })
    this.__streamClient = new StreamClient({
      endpointUrl,
      password,
      user,
    })
  }

  async load(term: Term): Promise<Resource | null> {
    if (term.termType !== 'NamedNode') {
      return null
    }

    const results = await SELECT`?type`.WHERE`${term} ${rdf.type} ?type`.execute(this.__client.query)

    if (results.length === 0) {
      return null
    }

    const types = results.map(({ type }) => type).reduce(onlyNamedNodes, new TermSet())
    const prefetchDataset = $rdf.dataset([...types].map(type => {
      return $rdf.quad(term, rdf.type, type)
    }))

    return {
      term,
      prefetchDataset,
      types,
      ...this.__createDatasetGetters(term),
    }
  }

  async forClassOperation(term: NamedNode): Promise<[Resource] | []> {
    log(`loading resource ${term.value}`)
    const resource = await this.load(term)

    return resource ? [resource] : []
  }

  async forPropertyOperation(term: NamedNode): Promise<PropertyResource[]> {
    log(`loading resource ${term.value} by object usage`)
    const bindings = await SELECT`*`
      .WHERE`
      graph ?parent {
        ?parent ?link ${term} .
        ?parent ${rdf.type} ?type .
      }`
      .execute(this.__client.query)

    const resources = bindings.reduce((set, { parent, link, type }) => {
      if (parent.termType !== 'NamedNode' || link.termType !== 'NamedNode') {
        return set
      }

      const resource = set.get(parent) || {
        term: parent,
        property: link,
        object: term,
        prefetchDataset: $rdf.dataset(),
        types: new TermSet(),
        ...this.__createDatasetGetters(parent),
      }

      resource.prefetchDataset.add($rdf.quad(parent, link, term))
      if (type.termType === 'NamedNode') {
        resource.types.add(type)
      }

      return set.set(parent, resource)
    }, new TermMap<NamedNode, PropertyResource>())

    return [...resources.values()]
  }

  private __createDatasetGetters(term: NamedNode): Pick<Resource, 'dataset' | 'quadStream'> {
    const fullDataset = () => {
      return CONSTRUCT`?s ?p ?o`.FROM(term).WHERE`?s ?p ?o`.execute(this.__streamClient.query)
    }

    return {
      dataset: once(async () => {
        return $rdf.dataset().import(await fullDataset())
      }),
      quadStream() {
        const forward = new PassThrough({
          objectMode: true,
        })

        fullDataset()
          .then(stream => stream.pipe(forward))
          .catch(err => forward.emit('error', err))

        return forward
      },
    }
  }
}

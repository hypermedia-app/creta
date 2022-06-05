import { NamedNode, Stream, Term, Variable } from 'rdf-js'
import { DESCRIBE, SELECT } from '@tpluscode/sparql-builder'
import { hydra, ldp, rdf } from '@tpluscode/rdf-ns-builders'
import $rdf from 'rdf-ext'
import cf, { AnyPointer, GraphPointer, MultiPointer } from 'clownface'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import { IriTemplate, IriTemplateMapping } from '@rdfine/hydra'
import { Api } from 'hydra-box/Api'
import { hyper_query, knossos } from '@hydrofoil/vocabularies/builders'
import type { StreamClient } from 'sparql-http-client/StreamClient'
import toArray from 'stream-to-array'
import { toSparql } from 'clownface-shacl-path'
import { toRdf } from 'rdf-literal'
import TermSet from '@rdfjs/term-set'
import { log, warn } from '../logger'
import { pathsToUnion, reduceToValidPaths } from '../query/eagerLinks'
import { ToSparqlPatterns } from './index'

function createTemplateVariablePatterns(subject: Variable, queryPointer: AnyPointer, api: Api) {
  return async (mapping: IriTemplateMapping): Promise<string | SparqlTemplateResult> => {
    const property = mapping.property
    if (!property) {
      log('Skipping mapping without property')
      return ''
    }

    if (hydra.pageIndex.equals(property.id)) {
      log('Skipping hydra:pageIndex property from query filters')
      return ''
    }

    const value = queryPointer.out(property.id)
    if (value.values.length === 0) {
      log('Value not found for %s', property.id.value)
      return ''
    }

    const queryFilters = mapping.pointer.out(hyper_query.filter)
    if (!queryFilters.value) {
      log('Implementation not found for %s', property.id.value)
      return ''
    }

    const createPattern = await api.loaderRegistry.load<ToSparqlPatterns>(queryFilters.toArray()[0], { basePath: api.codePath })
    if (!createPattern) {
      warn('Failed to load pattern function')
      return ''
    }

    return createPattern({
      subject,
      predicate: property.id,
      object: value,
    })
  }
}

function * createPatterns(subs: Term[], preds: Term[], objs: Term[], { graph }: { graph?: Variable }) {
  for (const subject of subs) {
    for (const predicate of preds) {
      for (const object of objs) {
        const pattern = sparql`${subject} ${predicate} ${object} .`

        yield graph ? sparql`GRAPH ${graph} { ${pattern} }` : pattern
      }
    }
  }
}

function toSparqlPattern(member: Variable) {
  const seen = new TermSet()

  return function (previous: SparqlTemplateResult[], memberAssertion: GraphPointer): SparqlTemplateResult[] {
    if (seen.has(memberAssertion.term)) {
      return previous
    }

    seen.add(memberAssertion.term)
    const subject = memberAssertion.out(hydra.subject).terms
    const predicate = memberAssertion.out(hydra.property).terms
    const object = memberAssertion.out(hydra.object).terms
    const graph = memberAssertion.out(knossos.ownGraphOnly).term?.equals(toRdf(true)) ? member : undefined

    if (subject.length && predicate.length && !object.length) {
      return [...previous, ...createPatterns(subject, predicate, [member], { graph })]
    }
    if (subject.length && object.length && !predicate.length) {
      return [...previous, ...createPatterns(subject, [member], object, { graph })]
    }
    if (predicate.length && object.length && !subject.length) {
      return [...previous, ...createPatterns([member], predicate, object, { graph })]
    }

    log('Skipping invalid member assertion')

    return previous
  }
}

type SelectBuilder = ReturnType<typeof SELECT>

function createOrdering(collectionTypes: MultiPointer, collection: GraphPointer, subject: Variable): { patterns: SparqlTemplateResult; addClauses(q: SelectBuilder): SelectBuilder } {
  const [instanceOrders] = collection.out(hyper_query.order).toArray()
  const [typeOrders] = collectionTypes.out(hyper_query.order).toArray()
  const orders = instanceOrders?.list() || typeOrders?.list()

  if (!orders) {
    return {
      patterns: sparql``,
      addClauses: q => q,
    }
  }

  let orderIndex = 0
  let patterns = sparql``
  const clauses: Array<{ variable: Variable; descending: boolean }> = []

  for (const order of orders) {
    const path = toSparql(order.out(hyper_query.path))
    const variable = $rdf.variable(`order${++orderIndex}`)

    const pattern = sparql`OPTIONAL { ${subject} ${path} ${variable} } .`
    patterns = sparql`${patterns}\n${pattern}`

    clauses.push({
      variable,
      descending: ldp.Descending.equals(order.out(hyper_query.direction).term),
    })
  }

  return {
    patterns,
    addClauses(query) {
      return clauses.reduce((orderedQuery, { variable, descending }) => {
        return orderedQuery.ORDER().BY(variable, descending)
      }, query)
    },
  }
}

function linkedResourcePatterns(api: AnyPointer, collection: GraphPointer, subject: Variable, linked: Variable) {
  const classIncludes = api.node(collection.out(rdf.type)).out(hyper_query.memberInclude).toArray()
  const instanceIncludes = collection.out(hyper_query.memberInclude).toArray()

  const includePaths = [...classIncludes, ...instanceIncludes]
    .flatMap(include => include.out(hyper_query.path).toArray())
    .reduce(reduceToValidPaths, [])

  if (!includePaths.length) {
    return ''
  }

  const union = includePaths.reduce(pathsToUnion(subject, linked), sparql``)

  return sparql`optional { ${union} }\nFILTER ( isIRI(${linked}) )`
}

interface DynamicCollection {
  api: Api
  collection: GraphPointer
  query: GraphPointer
  variables: IriTemplate | null
  pageSize: number
  client: StreamClient
}

const memberAssertionPredicates = [hydra.manages, hydra.memberAssertion]
export default async function ({ api, collection, client, pageSize, query, variables }: DynamicCollection) {
  const subject = $rdf.variable('member')
  const linked = $rdf.variable('linked')
  const apiPointer = cf(api)
  const collectionTypes = apiPointer.node(collection.out(rdf.type))

  const memberAssertions = [
    ...collectionTypes.out(memberAssertionPredicates).toArray().reduce(toSparqlPattern(subject), []),
    ...collection.out(memberAssertionPredicates).toArray().reduce(toSparqlPattern(subject), []),
  ]

  const managesBlockPatterns = memberAssertions.reduce((combined, next) => sparql`${combined}\n${next}`, sparql``)
  let filterPatters: Array<string | SparqlTemplateResult> = []
  if (variables) {
    filterPatters = await Promise.all(variables.mapping.map(createTemplateVariablePatterns(subject, query, api)))
  }

  const order = createOrdering(collectionTypes, collection, subject)

  const memberPatterns = sparql`${managesBlockPatterns}\n${filterPatters}`

  return {
    async members(): Promise<Term[]> {
      if (!memberAssertions.length) {
        warn(`Collection ${collection.value} has no valid manages block and will always return empty`)
        return []
      }

      let select = SELECT.DISTINCT`${subject}`
        .WHERE` 
          ${memberPatterns}
          filter (isIRI(${subject}))
        `

      const isPaged = variables?.mapping.some(mapping => mapping.property?.equals(hydra.pageIndex))

      if (isPaged) {
        const page = Number.parseInt(query.out(hydra.pageIndex).value || '1')
        const hydraLimit = query.out(hydra.limit).value
        const limit = hydraLimit ? parseInt(hydraLimit) : pageSize

        select = select.WHERE`${order.patterns}`.LIMIT(limit).OFFSET((page - 1) * limit)
        select = order.addClauses(select)
      }

      if (order && !isPaged) {
        warn('Collection has order definitions but is not paged')
      }

      const results = await select.execute(client.query).then(toArray)
      return results.map(({ member }) => member)
    },
    async total(): Promise<number> {
      const stream = await SELECT`(count(distinct ${subject}) as ?count)`.WHERE`${memberPatterns}`.execute(client.query)
      const [result] = await toArray(stream)

      return Number.parseInt(result.count.value)
    },
    async memberData(members: NamedNode[]): Promise<Stream> {
      if (!members.length) {
        return $rdf.dataset().toStream()
      }

      const ids = [...new TermSet(members)]
      const linkPatterns = linkedResourcePatterns(apiPointer, collection, subject, linked)

      if (linkPatterns) {
        return DESCRIBE`${subject} ${linked}`.WHERE`
          VALUES ${subject} {
            ${ids}
          }
        
          ${linkPatterns}
        `.execute(client.query)
      }

      return DESCRIBE`${subject}`.WHERE`VALUES ${subject} { ${ids} }`.execute(client.query)
    },
  }
}

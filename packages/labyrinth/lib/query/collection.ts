import { NamedNode, Stream, Term, Variable } from 'rdf-js'
import { DESCRIBE, SELECT } from '@tpluscode/sparql-builder'
import { hydra, ldp, rdf } from '@tpluscode/rdf-ns-builders'
import $rdf from 'rdf-ext'
import cf, { AnyPointer, GraphPointer } from 'clownface'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import { IriTemplate, IriTemplateMapping } from '@rdfine/hydra'
import { Api } from 'hydra-box/Api'
import { hyper_query, knossos } from '@hydrofoil/vocabularies/builders/strict'
import type { StreamClient } from 'sparql-http-client/StreamClient'
import once from 'once'
import toArray from 'stream-to-array'
import { toSparql } from 'clownface-shacl-path'
import { toRdf } from 'rdf-literal'
import TermSet from '@rdfjs/term-set'
import { log, warn } from '../logger'
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
  return function (previous: SparqlTemplateResult[], memberAssertion: GraphPointer): SparqlTemplateResult[] {
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

function createOrdering(api: AnyPointer, collection: GraphPointer, subject: Variable): { patterns: SparqlTemplateResult; addClauses(q: SelectBuilder): SelectBuilder } {
  const [instanceOrders] = collection.out(hyper_query.order).toArray()
  const [typeOrders] = api.node(collection.out(rdf.type)).out(hyper_query.order).toArray()
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
  const classIncludes = api.node(collection.out(rdf.type)).out(hyper_query.include).toArray()
  const instanceIncludes = collection.out(hyper_query.include).toArray()

  return [...classIncludes, ...instanceIncludes]
    .reduce((union: SparqlTemplateResult, include) => {
      const path = include.out(hyper_query.path)
      if (!path.values) {
        return union
      }

      const graphPattern = sparql`OPTIONAL {
        ${subject} ${toSparql(path)} ${linked} .
        FILTER ( isIRI(${linked}) )
      }`

      return sparql`${union}\n${graphPattern}`
    }, sparql``)
}

interface CollectionQueryParams {
  api: Api
  collection: GraphPointer
  query?: AnyPointer
  variables: IriTemplate | null
  pageSize: number
}

export interface SparqlQueries {
  members(client: StreamClient): Promise<NamedNode[]>
  memberData(client: StreamClient): Promise<Stream>
  totals(client: StreamClient): Promise<number>
}

export async function memberData(ids: Term[], client: StreamClient): Promise<Stream> {
  if (ids.length === 0) {
    return $rdf.dataset().toStream()
  }

  return DESCRIBE`${ids}`.execute(client.query)
}

export async function getSparqlQuery({ api, collection, pageSize, query = cf({ dataset: $rdf.dataset() }), variables } : CollectionQueryParams): Promise<SparqlQueries | null> {
  const subject = $rdf.variable('member')
  const linked = $rdf.variable('linked')

  const memberAssertions = collection
    .out([hydra.manages, hydra.memberAssertion])
    .toArray()
    .reduce(toSparqlPattern(subject), [])

  if (!memberAssertions.length) {
    warn(`Collection ${collection.value} has no valid manages block and will always return empty`)
    return null
  }

  const managesBlockPatterns = memberAssertions.reduce((combined, next) => sparql`${combined}\n${next}`, sparql``)
  let filterPatters: Array<string | SparqlTemplateResult> = []
  if (variables) {
    filterPatters = await Promise.all(variables.mapping.map(createTemplateVariablePatterns(subject, query, api)))
  }

  const order = createOrdering(cf(api), collection, subject)

  const memberPatterns = sparql`${managesBlockPatterns}\n${filterPatters}`

  let memberSelect = SELECT.DISTINCT`${subject} ${linked}`.WHERE` 
                ${memberPatterns}
                ${linkedResourcePatterns(cf(api), collection, subject, linked)}
                filter (isIRI(${subject}))`

  if (variables && variables.mapping.some(mapping => mapping.property?.equals(hydra.pageIndex))) {
    const page = Number.parseInt(query.out(hydra.pageIndex).value || '1')
    const hydraLimit = query.out(hydra.limit).value
    const limit = hydraLimit ? parseInt(hydraLimit) : pageSize

    memberSelect = memberSelect.WHERE`${order.patterns}`.LIMIT(limit).OFFSET((page - 1) * limit)
    memberSelect = order.addClauses(memberSelect)
  }

  const loadIdentifiers = once(async (client: StreamClient) => {
    const results: Array<Record<string, NamedNode>> = await memberSelect.execute(client.query).then(toArray)
    return results.reduce((sets, row) => {
      sets.members.add(row.member)
      if (row.linked) {
        sets.linked.add(row.linked)
      }

      return sets
    }, {
      members: new TermSet<NamedNode>(),
      linked: new TermSet<NamedNode>(),
    })
  })

  return {
    async members(client) {
      const { members } = await loadIdentifiers(client)
      return [...members]
    },
    async memberData(client) {
      const ids = await loadIdentifiers(client)
      return memberData([...ids.members, ...ids.linked], client)
    },
    async totals(client) {
      const stream = await SELECT`(count(distinct ${subject}) as ?count)`.WHERE`${memberPatterns}`.execute(client.query)
      const [result] = await toArray(stream)

      return Number.parseInt(result.count.value)
    },
  }
}

import { NamedNode, Stream, Term, Variable } from 'rdf-js'
import { SELECT } from '@tpluscode/sparql-builder'
import { hydra, ldp, rdf } from '@tpluscode/rdf-ns-builders'
import $rdf from 'rdf-ext'
import cf, { AnyPointer, GraphPointer, MultiPointer } from 'clownface'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import { IriTemplate, IriTemplateMapping } from '@rdfine/hydra'
import { Api } from 'hydra-box/Api'
import { hyper_query } from '@hydrofoil/vocabularies/builders'
import type { StreamClient } from 'sparql-http-client/StreamClient'
import toArray from 'stream-to-array'
import { toSparql } from 'clownface-shacl-path'
import { isGraphPointer } from 'is-graph-pointer'
import { DescribeStrategy, DescribeStrategyFactory, unionGraphDescribe } from '../../describeStrategy'
import { loadImplementations } from '../code'
import { log, warn } from '../logger'
import { exactMatch } from './filters'
import { memberAssertionPatterns } from './memberAssertion'
import { Filter } from '.'

function createTemplateVariablePatterns(subject: Variable, queryPointer: AnyPointer, api: Api) {
  return async (mapping: IriTemplateMapping, index: number): Promise<string | SparqlTemplateResult> => {
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

    let createPattern: Filter<unknown[]>
    let args: any[] = []
    const queryFilters = mapping.pointer.out(hyper_query.filter)
    if (!queryFilters.value) {
      log('Applying implicit exact match filter for %s', property.id.value)
      createPattern = exactMatch
    } else {
      const [loaded] = await loadImplementations<Filter>(queryFilters, { api, log }, { single: true })
      if (!loaded) {
        warn('Failed to load pattern function')
        return ''
      }

      ([createPattern, args] = loaded)
    }

    return createPattern({
      subject,
      predicate: property.id,
      object: value,
      variable(name) {
        return $rdf.variable(`filter${index + 1}_${name}`)
      },
    }, ...args)
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
  const apiPointer = cf(api)
  const collectionTypes = apiPointer.node(collection.out(rdf.type))

  const memberAssertions = [
    ...memberAssertionPatterns(collectionTypes.out(memberAssertionPredicates), subject),
    ...memberAssertionPatterns(collection.out(memberAssertionPredicates), subject),
  ]

  const managesBlockPatterns = memberAssertions.reduce((combined, next) => sparql`${combined}\n${next}`, sparql``)
  let filterPatters: Array<string | SparqlTemplateResult> = []
  if (variables) {
    filterPatters = await createFilters({ variables, subject, query, api })
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
      const describeMembers = await getMembersDescribe(api, collection, collectionTypes, client)
      return describeMembers(...members)
    },
  }
}

async function getMembersDescribe(
  api: Api,
  collection: GraphPointer,
  collectionTypes: MultiPointer,
  client: StreamClient): Promise<DescribeStrategy> {
  let pointer = collection.out(hyper_query.memberDescribeStrategy)
  if (!isGraphPointer(pointer)) {
    pointer = collectionTypes.out(hyper_query.memberDescribeStrategy)
  }

  const [strategy] = await loadImplementations<DescribeStrategyFactory<unknown[]>>(pointer, { api, log }, {
    throwWhenLoadFails: true,
    single: true,
  })

  const apiPtr = cf(api) as GraphPointer
  if (strategy) {
    const [impl, args] = strategy
    return impl({ api: apiPtr, resource: collection, client }, ...args)
  }

  return unionGraphDescribe({ api: apiPtr, resource: collection, client }, hyper_query.memberInclude)
}

export async function createFilters({ subject, query, api, variables }: {
  subject: Variable
  query: GraphPointer
  api: Api
  variables: IriTemplate
}): Promise<Array<string | SparqlTemplateResult>> {
  return Promise.all(variables.mapping.map(createTemplateVariablePatterns(subject, query, api)))
}

import { Assertion, AssertionError } from 'chai'
import { Parser, SparqlQuery } from 'sparqljs'
import type { SparqlTemplateResult } from '@tpluscode/rdf-string'
import sinon from 'sinon'
import $rdf from 'rdf-ext'
import Endpoint from 'sparql-http-client/Endpoint'
import StreamStore from 'sparql-http-client/StreamStore'

const sparqlParser = new Parser()

export const client = () => ({
  store: sinon.createStubInstance(StreamStore) as any,
  query: {
    endpoint: sinon.createStubInstance(Endpoint),
    ask: sinon.stub().resolves(true),
    construct: sinon.stub().resolves($rdf.dataset().toStream()),
    select: sinon.stub().resolves([]),
    update: sinon.stub(),
  },
})

export type StubbedClient = ReturnType<typeof client>

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Chai {
    interface TypeComparison {
      query(expected: string | SparqlTemplateResult): void
    }
  }
}

Assertion.addMethod('query', function (this: Chai.AssertionStatic, expected: string | SparqlTemplateResult) {
  let expectedQuery: SparqlQuery
  let actualQuery: SparqlQuery

  try {
    expectedQuery = sparqlParser.parse(expected.toString())
  } catch (e: any) {
    throw new AssertionError(`Failed to parse expected query.
${e.message}.

Query was:
${expected}`)
  }

  try {
    let actualQueryString: string
    if (typeof this._obj === 'string') {
      actualQueryString = this._obj
    } else {
      actualQueryString = this._obj.build()
    }
    actualQuery = sparqlParser.parse(actualQueryString)
  } catch (e: any) {
    throw new AssertionError(`Failed to parse actual query.
${e.message}.

Query was:
${this._obj.toString()}`)
  }

  new Assertion(actualQuery).deep.eq(expectedQuery)
})

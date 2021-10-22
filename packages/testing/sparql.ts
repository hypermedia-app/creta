import { Assertion, AssertionError } from 'chai'
import { Parser, SparqlQuery } from 'sparqljs'
import type { SparqlTemplateResult } from '@tpluscode/rdf-string'

const sparqlParser = new Parser()

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
    actualQuery = sparqlParser.parse(this._obj)
  } catch (e: any) {
    throw new AssertionError(`Failed to parse actual query.
${e.message}.

Query was:
${this._obj.toString()}`)
  }

  new Assertion(actualQuery).deep.eq(expectedQuery)
})

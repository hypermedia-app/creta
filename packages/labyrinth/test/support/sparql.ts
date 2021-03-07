/* eslint-disable prefer-rest-params */
import { Assertion, AssertionError } from 'chai'
import { Parser, SparqlQuery } from 'sparqljs'
import { SparqlTemplateResult } from '@tpluscode/rdf-string'

const sparqlParser = new Parser()

// eslint-disable-next-line no-undef
Assertion.addMethod('query', function (this: Chai.AssertionStatic, expected: string | SparqlTemplateResult) {
  let expectedQuery: SparqlQuery
  let actualQuery: SparqlQuery

  try {
    expectedQuery = sparqlParser.parse(expected.toString())
  } catch (e) {
    throw new AssertionError(`Failed to parse expected query.
${e.message}.

Query was:
${expected}`)
  }

  try {
    actualQuery = sparqlParser.parse(this._obj)
  } catch (e) {
    throw new AssertionError(`Failed to parse actual query.
${e.message}.

Query was:
${this._obj.toString()}`)
  }

  new Assertion(actualQuery).deep.eq(expectedQuery)
})

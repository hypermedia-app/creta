declare module Chai {
  interface TypeComparison {
    query(expected: string | object): Chai.Assertion
  }
}

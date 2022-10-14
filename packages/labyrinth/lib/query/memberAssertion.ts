import { Term, Variable } from 'rdf-js'
import { sparql, SparqlTemplateResult } from '@tpluscode/rdf-string'
import TermSet from '@rdfjs/term-set'
import { GraphPointer, MultiPointer } from 'clownface'
import { hydra, rdf, sh } from '@tpluscode/rdf-ns-builders'
import { knossos } from '@hydrofoil/vocabularies/builders'
import { toRdf } from 'rdf-literal'
import { isBlankNode } from 'is-graph-pointer'
import { shapeToPatterns } from '@hydrofoil/shape-to-query'
import $rdf from 'rdf-ext'
import { log } from '../../lib/logger'

export function memberAssertionPatterns(memberAssertions: MultiPointer, subject: Variable): SparqlTemplateResult[] {
  return memberAssertions.toArray().reduce(toSparqlPattern(subject), [])
}

function toSparqlPattern(member: Variable) {
  const seen = new TermSet()

  return function (previous: SparqlTemplateResult[], memberAssertion: GraphPointer): SparqlTemplateResult[] {
    if (seen.has(memberAssertion.term)) {
      return previous
    }

    seen.add(memberAssertion.term)
    const subject = memberAssertion.out(hydra.subject)
    const predicate = memberAssertion.out(hydra.property)
    const object = memberAssertion.out(hydra.object)
    const graph = memberAssertion.out(knossos.ownGraphOnly).term?.equals(toRdf(true)) ? member : undefined
    const memberPointer = memberAssertion.node(member)

    if (subject.values.length && predicate.values.length && !object.values.length) {
      return [...previous, ...createPatterns(subject, predicate, memberPointer, { graph })]
    }
    if (subject.values.length && object.values.length && !predicate.values.length) {
      return [...previous, ...createPatterns(subject, memberPointer, object, { graph })]
    }
    if (predicate.values.length && object.values.length && !subject.values.length) {
      return [...previous, ...createPatterns(memberPointer, predicate, object, { graph })]
    }

    log('Skipping invalid member assertion')

    return previous
  }
}

function * createPatterns(subs: MultiPointer, preds: MultiPointer, objs: MultiPointer, { graph }: { graph?: Variable }) {
  for (const [subject, subjectPatterns] of subs.map(createPatternValue('ma_s'))) {
    for (const [predicate, predicatePatterns] of preds.map(createPatternValue('ma_p'))) {
      for (const [object, objectPatterns] of objs.map(createPatternValue('ma_o'))) {
        if (!object || !subject || !predicate) continue

        const patterns = sparql`
          ${subject} ${predicate} ${object} .
          ${subjectPatterns}
          ${predicatePatterns}
          ${objectPatterns}
        `

        yield graph ? sparql`GRAPH ${graph} { ${patterns} }` : patterns
      }
    }
  }
}

function createPatternValue(variable: string) {
  return (ptr: GraphPointer, index: number): [Term | null, SparqlTemplateResult] | [Term | null] => {
    if (isBlankNode(ptr)) {
      if (isNodeShape(ptr)) {
        const variableName = `${variable}${index}`

        return [$rdf.variable(variableName), shapeToPatterns(ptr, variableName)]
      }

      return [null]
    }

    return [ptr.term]
  }
}

function isNodeShape(pointer: GraphPointer) {
  return pointer.has(rdf.type, sh.NodeShape).terms.length > 0
}

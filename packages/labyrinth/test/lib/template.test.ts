import { expect } from 'chai'
import { toPointer } from 'labyrinth/lib/template'
import { fromPointer } from '@rdfine/hydra/lib/IriTemplate'
import { blankNode } from '@labyrinth/testing/nodeFactory'
import httpError from 'http-errors'
import { hydra, schema, xsd } from '@tpluscode/rdf-ns-builders/loose'
import $rdf from 'rdf-ext'
import RdfResource from '@tpluscode/rdfine'
import { IriTemplateBundle } from '@rdfine/hydra/bundles'

RdfResource.factory.addMixin(...IriTemplateBundle)

describe('@hydrofoil/labyrinth/lib/template', () => {
  describe('toPointer', () => {
    it('throws when a required variable is not set', () => {
      // given
      const template = fromPointer(blankNode(), {
        template: '/{name}',
        mapping: [{
          variable: 'name',
          required: true,
        }],
      })

      // then
      expect(() => toPointer(template.pointer, {})).to.throw(httpError.BadRequest)
    })

    it('ignores unrecognized query params', () => {
      // given
      const template = fromPointer(blankNode(), {
        template: '/{name}',
        mapping: [{
          variable: 'first',
          property: schema.givenName,
        }],
      })

      // when
      const graph = toPointer(template.pointer, {
        first: 'john',
        last: 'doe',
      })

      // then
      expect(graph.dataset).to.have.length(1)
      expect(graph.out(schema.givenName).value).to.eq('john')
    })

    it('constructs correct terms when using explicit representation', () => {
      // given
      const template = fromPointer(blankNode(), {
        template: '/{name},{age},{type}',
        variableRepresentation: hydra.ExplicitRepresentation,
        mapping: [{
          variable: 'name',
          property: schema.name,
        }, {
          variable: 'age',
          property: schema.age,
        }, {
          variable: 'type',
          property: schema.identifier,
        }],
      })

      // when
      const graph = toPointer(template.pointer, {
        age: `"20"^^${xsd.unsignedInt.value}`,
        name: '"John"@en',
        type: schema.Person.value,
      })

      // then
      expect(graph.out(schema.name).term).to.deep.eq($rdf.literal('John', 'en'))
      expect(graph.out(schema.age).term).to.deep.eq($rdf.literal('20', xsd.unsignedInt))
      expect(graph.out(schema.identifier).term).to.deep.eq(schema.Person)
    })
  })
})

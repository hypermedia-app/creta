import { expect } from 'chai'
import { sparql } from '@tpluscode/rdf-string'
import { blankNode, namedNode, parse, append } from '@labyrinth/testing/nodeFactory'
import { foaf, rdf, schema, sh } from '@tpluscode/rdf-ns-builders'
import sinon from 'sinon'
import { ex } from '@labyrinth/testing/namespace'
import type { GraphPointer } from 'clownface'
import { hyper_query } from '@hydrofoil/vocabularies/builders'
import { constructByNodeShape } from '../describeStrategy'
import '@labyrinth/testing/sparql'

describe('@hydrofoil/creta-labs/describeStrategy', () => {
  let api: GraphPointer
  let client: any

  beforeEach(() => {
    api = blankNode()
    client = {
      query: {
        construct: sinon.spy(),
      },
    }
  })

  describe('constructByNodeShape', () => {
    it("constructs from class's query:constructShape by default", async () => {
      // given
      await append`
        ${ex.Class}
          ${hyper_query.constructShape} [
            ${sh.targetClass} ${foaf.Person} ;
            ${sh.property} [
              ${sh.path} ${foaf.name} ;
            ] ;
          ] .
      `.to(api)
      const resource = await parse`<> a ${ex.Class} .`
      const describe = await constructByNodeShape({ api, client, resource })

      // when
      await describe(ex.foobar)

      // then
      expect(client.query.construct.firstCall.firstArg).to.be.a.query(sparql`
        CONSTRUCT {
          ?resource ${rdf.type} ?resource_0_0 .
          ?resource a ${foaf.Person} .
          ?resource ${foaf.name} ?resource_1_0 .
        } WHERE {
          VALUES ?resource { ${ex.foobar} }
        
          {
            ?resource ${rdf.type} ?resource_0_0 .
          }
          UNION 
          {
            ?resource a ${foaf.Person} .
            ?resource ${foaf.name} ?resource_1_0 .
          }
        }
      `)
    })

    it('constructs from alternative shape', async () => {
      // given
      await append`
        ${ex.Class}
          ${hyper_query.constructShape} [
            ${sh.targetClass} ${foaf.Person} ;
            ${sh.property} [
              ${sh.path} ${foaf.name} ;
            ] ;
          ] ;
          ${ex.shape} [
            ${sh.targetClass} ${schema.Person} ;
            ${sh.property} [
              ${sh.path} ${schema.name} ;
            ] ;
          ] .
      `.to(api)
      const resource = await parse`<> a ${ex.Class} .`
      const shapePath = namedNode(ex.shape)
      const describe = await constructByNodeShape({ api, client, resource }, { shapePath })

      // when
      await describe(ex.foobar)

      // then
      expect(client.query.construct.firstCall.firstArg).to.be.a.query(sparql`
        CONSTRUCT {
          ?resource ${rdf.type} ?resource_0_0 .
          ?resource a ${schema.Person} .
          ?resource ${schema.name} ?resource_1_0 .
        } WHERE {
          VALUES ?resource { ${ex.foobar} }
        
          {
            ?resource ${rdf.type} ?resource_0_0 .
          }
          UNION 
          {
            ?resource a ${schema.Person} .
            ?resource ${schema.name} ?resource_1_0 .
          }
        }
      `)
    })

    it('combines multiple shapes', async () => {
      // given
      await append`
        ${ex.ClassA}
          ${hyper_query.constructShape} [
            ${sh.property} [
              ${sh.path} ${foaf.name} ;
            ] ;
          ] .
        ${ex.ClassB}
          ${hyper_query.constructShape} [
            ${sh.property} [
              ${sh.path} ${schema.name} ;
            ] ;
          ] .
      `.to(api)
      const resource = await parse`<> a ${ex.ClassA}, ${ex.ClassB} .`
      const describe = await constructByNodeShape({ api, client, resource })

      // when
      await describe(ex.foobar)

      // then
      expect(client.query.construct.firstCall.firstArg).to.be.a.query(sparql`
        CONSTRUCT {
          ?resource ${rdf.type} ?resource_0_0 .
          ?resource ${foaf.name} ?resource_1_0 .
          ?resource ${schema.name} ?resource_2_0 .
        } WHERE {
          VALUES ?resource { ${ex.foobar} }
        
          {
            ?resource ${rdf.type} ?resource_0_0 .
          }
          UNION 
          {
            ?resource ${foaf.name} ?resource_1_0 .
          }
          UNION 
          {
            ?resource ${schema.name} ?resource_2_0 .
          }
        }
      `)
    })
  })
})

import { expect } from 'chai'
import $rdf from 'rdf-ext'
import clownface from 'clownface'
import { client, testData } from '@labyrinth/testing/client'
import { ex } from '@labyrinth/testing/namespace'
import { sparql } from '@tpluscode/rdf-string'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import { loadClasses } from '../../lib/query'

describe('@hydrofoil/knossos/lib/query', () => {
  describe('loadClasses', () => {
    it('finds all classes for the given API', async () => {
      // given
      await testData(sparql`
        ${ex.Class} a ${hydra.Class} ; ${hydra.apiDocumentation} ${ex.api} .
      `)

      // when
      const dataset = await $rdf.dataset().import(await loadClasses(ex.api, client))

      // then
      const clas = clownface({ dataset }).namedNode(ex.Class)
      expect(clas.out().values).to.have.length.greaterThan(0)
    })

    it('loads operations supported by properties', async () => {
      // given
      await testData(sparql`
        ${ex.Class} a ${hydra.Class} ; ${hydra.apiDocumentation} ${ex.api} .
        ${ex.Class} ${hydra.supportedProperty} [
          ${hydra.property} ${ex.property} ;
        ] .
        ${ex.property} ${hydra.supportedOperation} ${ex.doStuff} .
        ${ex.doStuff} a ${hydra.Operation} .
      `)

      // when
      const dataset = await $rdf.dataset().import(await loadClasses(ex.api, client))

      // then
      const supportedOp = clownface({ dataset }).namedNode(ex.doStuff)
      expect(supportedOp.out().values).to.have.length.greaterThan(0)
      const prop = clownface({ dataset }).namedNode(ex.property)
      expect(prop.out().values).to.have.length.greaterThan(0)
    })

    describe('database shared between APIs', () => {
      it('returns only classes from the correct API', async () => {
        // given
        await testData(sparql`
          # API 1
          ${ex.Api1Class} a ${hydra.Class} ; ${hydra.apiDocumentation} ${ex.api1} .
          ${ex.Api1Class2} a ${hydra.Class} ; ${hydra.supportedOperation} [ ${hydra.apiDocumentation} ${ex.api1} ] .
          ${ex.Api1Class3} a ${hydra.Class} ; ${hydra.supportedProperty} [ 
            ${hydra.property} [
              ${hydra.supportedOperation} [ ${hydra.apiDocumentation} ${ex.api1} ] ;
            ] ;
          ] .
          
          # API 2
          ${ex.Api2Class} a ${hydra.Class} ; ${hydra.apiDocumentation} ${ex.api2} .
          ${ex.Api2Class2} a ${hydra.Class} ; ${hydra.supportedOperation} [ ${hydra.apiDocumentation} ${ex.api2} ] .
          ${ex.Api2Class3} a ${hydra.Class} ; ${hydra.supportedProperty} [ 
            ${hydra.property} [
              ${hydra.supportedOperation} [ ${hydra.apiDocumentation} ${ex.api2} ] ;
            ] ;
          ] .
        `)

        // when
        const dataset = await $rdf.dataset().import(await loadClasses(ex.api1, client))

        // then
        const ptr = clownface({ dataset }).has(rdf.type, hydra.Class)
        expect(ptr.terms).to.have.length(3)
        expect(ptr.terms).to.deep.contain.members([
          ex.Api1Class, ex.Api1Class2, ex.Api1Class3,
        ])
      })
    })
  })
})

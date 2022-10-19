import { describe, it, before } from 'mocha'
import { expect } from 'chai'
import { INSERT } from '@tpluscode/sparql-builder'
import StreamClient from 'sparql-http-client/StreamClient'
import { foaf, hydra, rdf, schema } from '@tpluscode/rdf-ns-builders'
import $rdf from 'rdf-ext'
import { PropertyResource } from 'hydra-box'
import clownface from 'clownface'
import { ex } from '@labyrinth/testing/namespace'
import TermSet from '@rdfjs/term-set'
import { SparqlQueryLoader } from '../../lib/loader'

describe('@hydrofoil/labyrinth/lib/loader/SparqlQueryLoader', function () {
  this.timeout(200000)

  const endpoint = {
    endpointUrl: 'http://db.labyrinth.lndo.site/repositories/labyrinth',
    updateUrl: 'http://db.labyrinth.lndo.site/repositories/labyrinth',
    user: 'minos',
    password: 'password',
  }
  const loader = new SparqlQueryLoader(endpoint)

  before(async () => {
    await INSERT.DATA`
      graph ${ex.Howard} {
        ${ex.Howard} 
          ${rdf.type} ${schema.Person}, ${hydra.Resource} ;
          ${schema.name} "Howard Wolowitz" ;
          ${schema.spouse} ${ex.Bernadette} ;
      }
      
      graph ${ex.Sheldon} {
        ${ex.Sheldon}  
          ${rdf.type} ${schema.Person}, ${hydra.Resource} ;
          ${foaf.knows} ${ex.Bernadette}, ${ex.Howard} ;
      }
      
      graph ${ex.Penny} {
        ${ex.Penny}  
          ${rdf.type} ${schema.Person}, ${hydra.Resource} ;
          ${foaf.knows} ${ex.Bernadette}, ${ex.Howard} ;
      }
      
      graph ${ex.Leonard} {
        ${ex.Leonard} 
          ${rdf.type} ${schema.Person}, ${hydra.Resource} ;
          ${foaf.knows} ${ex.Bernadette}, ${ex.Howard}, ${ex.Penny} ;
          ${schema.knows} ${ex.Penny} ;
          ${schema.spouse} ${ex.Penny} ;
          ${schema.name} "Leonard Hofstadter" ; 
      }
      
      graph ${ex.Amy} {
        ${ex.Amy} ${schema.name} "Amy Farrah-Fowler"
      }
      
      [
        a ${hydra.Class} ;
        ${hydra.supportedProperty} [
          ${hydra.property} ${foaf.knows} ;
        ] ;
      ] .
      
      [
        a ${hydra.Class} ;
        ${hydra.supportedProperty} [
          ${hydra.property} ${schema.knows} ;
        ] ;
      ] .
    `.execute(new StreamClient(endpoint).query)
  })

  describe('.forClassOperation', () => {
    it('returns object with term', async () => {
      // given
      const term = ex.Howard

      // when
      const [resource] = await loader.forClassOperation(term)

      // then
      expect(resource).to.contain({
        term,
      })
    })

    it('returns null if resource has no types', async () => {
      // given
      const term = ex.Amy

      // when
      const resources = await loader.forClassOperation(term)

      // then
      expect(resources).to.be.empty
    })

    it('returns empty if resource has no graph', async () => {
      // given
      const term = ex.Kripke

      // when
      const resources = await loader.forClassOperation(term)

      // then
      expect(resources).to.be.empty
    })

    it('returns resource types', async () => {
      // given
      const term = ex.Howard

      // when
      const [resource] = await loader.forClassOperation(term)

      // then
      expect([...resource!.types].map(t => t.value)).to.contain.members([
        schema.Person.value,
        hydra.Resource.value,
      ])
    })

    it('returns minimal prefetchDataset', async () => {
      // given
      const term = ex.Howard

      // when
      const [resource] = await loader.forClassOperation(term)

      // then
      expect(resource).to.contain({
        term,
      })
      expect(resource?.prefetchDataset).to.have.property('size', 2)
    })

    it('returns getter for full resource graph', async () => {
      // given
      const term = ex.Howard

      // when
      const [resource] = await loader.forClassOperation(term)

      // then
      expect(await resource?.dataset()).to.have.property('size', 4)
    })

    it('returns getter for full resource graph stream', async () => {
      // given
      const term = ex.Howard

      // when
      const [resource] = await loader.forClassOperation(term)

      // then
      const dataset = await $rdf.dataset().import(resource!.quadStream())
      expect(dataset).to.have.property('size', 4)
    })
  })

  describe('.forPropertyOperation', () => {
    it('returns objects for each supported property usage', async () => {
      // given
      const term = ex.Bernadette

      // when
      const resources = await loader.forPropertyOperation(term)

      // then
      const subjects = resources.map(({ term }) => term.value)
      expect(subjects).to.contain.all.members([
        ex.Sheldon.value,
        ex.Leonard.value,
        ex.Penny.value,
      ])
    })

    it('returns objects for usage of same object with multiple properties', async () => {
      // given
      const term = ex.Penny

      // when
      const resources = await loader.forPropertyOperation(term)

      // then
      const properties = resources.map(({ property }) => property)
      expect(resources).to.containAll<PropertyResource>(({ term }) => term.equals(ex.Leonard))
      expect(properties).to.have.length(2)
      expect(properties).to.deep.contain.all.members([
        foaf.knows,
        schema.knows,
      ])
    })

    it('returns link info about each property usage', async () => {
      // given
      const term = ex.Howard

      // when
      const resources = await loader.forPropertyOperation(term)

      // then
      expect(resources).to.containAll<PropertyResource>(item => {
        return item.object.equals(ex.Howard) && item.property.equals(foaf.knows)
      })
    })

    it('does not return links which are not supported properties', async () => {
      // given
      const term = ex.Penny

      // when
      const resources = await loader.forPropertyOperation(term)

      // then
      const properties = new TermSet([...resources.map(p => p.property)])
      expect(properties.has(schema.spouse)).to.be.false
    })

    it('returns dataset getter for containing graph', async () => {
      // given
      const term = ex.Penny

      // when
      const [resource] = await loader.forPropertyOperation(term)

      // then
      const dataset = await resource.dataset()
      const leonard = clownface({ dataset })
        .has(schema.spouse, term)
      expect(leonard.out(schema.name).value).to.equal('Leonard Hofstadter')
    })

    it('returns quad stream getter for containing graph', async () => {
      // given
      const term = ex.Penny

      // when
      const [resource] = await loader.forPropertyOperation(term)

      // then
      const dataset = await $rdf.dataset().import(resource.quadStream())
      const leonard = clownface({ dataset })
        .has(schema.spouse, term)
      expect(leonard.out(schema.name).value).to.equal('Leonard Hofstadter')
    })
  })
})

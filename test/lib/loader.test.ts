import { describe, it, before } from 'mocha'
import { expect } from 'chai'
import * as compose from 'docker-compose'
import { INSERT } from '@tpluscode/sparql-builder'
import StreamClient from 'sparql-http-client/StreamClient'
import { foaf, hydra, rdf, schema } from '@tpluscode/rdf-ns-builders'
import $rdf from 'rdf-ext'
import waitOn from 'wait-on'
import { PropertyResource } from 'hydra-box'
import clownface from 'clownface'
import { ex } from '../support/namespace'
import { SparqlQueryLoader } from '../../lib/loader'

describe('SparqlQueryLoader', function () {
  this.timeout(200000)

  const endpoint = {
    endpointUrl: 'http://localhost:3030/labyrinth/query',
    updateUrl: 'http://localhost:3030/labyrinth/update',
    user: 'admin',
    password: 'password',
  }
  const loader = new SparqlQueryLoader(endpoint)

  before(async () => {
    await compose.upAll()
    await waitOn({
      resources: ['http://localhost:3030'],
    })
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
          ${foaf.knows} ${ex.Bernadette}, ${ex.Howard} ;
          ${schema.spouse} ${ex.Penny} ;
          ${schema.name} "Leonard Hofstadter" ; 
      }
      
      graph ${ex.Amy} {
        ${ex.Amy} ${schema.name} "Amy Farrah-Folwer"
      }
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
    it('returns objects for each property usage', async () => {
      // given
      const term = ex.Bernadette

      // when
      const resoruces = await loader.forPropertyOperation(term)

      // then
      const subjects = resoruces.map(({ term }) => term.value)
      expect(subjects).to.contain.all.members([
        ex.Sheldon.value,
        ex.Leonard.value,
        ex.Penny.value,
        ex.Howard.value,
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

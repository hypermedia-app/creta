import TermSet from '@rdfjs/term-set'
import { rdf, rdfs, sh } from '@tpluscode/rdf-ns-builders'
import { shaclMiddleware } from 'express-middleware-shacl'
import $rdf from 'rdf-ext'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import clownface from 'clownface'

export const shaclValidate = shaclMiddleware({
  async loadShapes(req) {
    const types = new TermSet([
      ...(req.hydra.resource?.types || []),
      ...req.shacl.dataGraph.out(rdf.type).terms,
    ])

    const describe = DESCRIBE`?class ?subClass`
      .WHERE`
        VALUES ?class { ${[...types]} }
        
        ?class ${rdf.type}?/${rdfs.subClassOf}* ?subClass .
      `

    const dataset = await $rdf.dataset().import(await describe.execute(req.labyrinth.sparql.query))

    const hasSubClass = clownface({ dataset }).has(rdfs.subClassOf)
    for (const shape of hasSubClass.toArray()) {
      const subShapes = shape.out(rdfs.subClassOf)
      shape.addList(sh.and, subShapes)
    }

    return dataset
  },
})

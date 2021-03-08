import clownface, { GraphPointer } from 'clownface'
import { NamedNode } from 'rdf-js'
import $rdf from 'rdf-ext'
import { hydra, rdf, sh } from '@tpluscode/rdf-ns-builders'
import { code, query } from '@hydrofoil/labyrinth/lib/namespace'
import { fromPointer as initCollection } from '@rdfine/hydra/lib/Collection'
import {knossos} from "./namespace";

export function ApiDocumentation(term: NamedNode): GraphPointer<NamedNode> {
  const graph = clownface({ dataset: $rdf.dataset() })

  graph.node(hydra.Resource)
    .addOut(hydra.supportedOperation, operation => {
      operation
        .addOut(hydra.method, 'GET')
        .addOut(code.implementedBy, implementation => {
          implementation
            .addOut(rdf.type, code.EcmaScript)
            .addOut(code.link, graph.namedNode('node:@hydrofoil/labyrinth/resource#get'))
        })
    })
    .addOut(hydra.supportedOperation, operation => {
      operation
        .addOut(hydra.method, 'PUT')
        .addOut(code.implementedBy, implementation => {
          implementation
            .addOut(rdf.type, code.EcmaScript)
            .addOut(code.link, graph.namedNode('node:@hydrofoil/knossos/resource#put'))
        })
    })

  graph.node(hydra.Collection)
    .addOut(hydra.supportedOperation, operation => {
      operation
        .addOut(hydra.method, 'GET')
        .addOut(code.implementedBy, implementation => {
          implementation
            .addOut(rdf.type, code.EcmaScript)
            .addOut(code.link, graph.namedNode('node:@hydrofoil/labyrinth/collection#get'))
        })
    })

  return graph.node(term)
    .addOut(rdf.type, hydra.ApiDocumentation)
    // .addOut(hydra.entrypoint, $rdf.namedNode('/'))
    .addOut(query.include, hydra.supportedClass)
}

export function ClassesCollection(apiDocumentation: NamedNode): GraphPointer<NamedNode> {
  const pointer = clownface({ dataset: $rdf.dataset() })
    .namedNode(`${apiDocumentation.value}/classes`)

  initCollection(pointer, {
    manages: [{
      property: rdf.type,
      object: hydra.Class,
    }],
  })

  return pointer
}

export function HydraClass(): GraphPointer<NamedNode> {
  return clownface({ dataset: $rdf.dataset() })
    .namedNode(hydra.Class)
    .addOut(rdf.type, sh.NodeShape)
    .addOut(knossos.createWithPUT, true)
}

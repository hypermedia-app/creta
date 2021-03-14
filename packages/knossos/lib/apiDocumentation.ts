import clownface, { GraphPointer } from 'clownface'
import { NamedNode } from 'rdf-js'
import $rdf from 'rdf-ext'
import { hydra, rdf, rdfs, sh } from '@tpluscode/rdf-ns-builders'
import { auth, code } from '@hydrofoil/labyrinth/lib/namespace'
import { fromPointer as initCollection } from '@rdfine/hydra/lib/Collection'
import { knossos } from './namespace'

export function ApiDocumentation(term: NamedNode, entrypoint: string): GraphPointer<NamedNode> {
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
    .addOut(hydra.entrypoint, graph.namedNode(entrypoint))
}

export function Entrypoint(term: string): GraphPointer<NamedNode> {
  return clownface({ dataset: $rdf.dataset() })
    .namedNode(term)
    .addOut(rdf.type, hydra.Resource)
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
  const graph = clownface({ dataset: $rdf.dataset() })

  return graph.namedNode(hydra.Class)
    .addOut(rdf.type, [sh.NodeShape, rdfs.Class, hydra.Class])
    .addOut(knossos.createWithPUT, true)
    .addOut(hydra.supportedOperation, operation => {
      operation
        .addOut(hydra.method, 'PUT')
        .addOut(auth.required, true)
        .addOut(auth.permissions, 'admins')
        .addOut(code.implementedBy, implementation => {
          implementation
            .addOut(rdf.type, code.EcmaScript)
            .addOut(code.link, graph.namedNode('node:@hydrofoil/knossos/resource#PUT'))
        })
    })
    .addOut(hydra.supportedOperation, operation => {
      operation
        .addOut(hydra.method, 'DELETE')
        .addOut(auth.required, true)
        .addOut(auth.permissions, 'admins')
        .addOut(code.implementedBy, implementation => {
          implementation
            .addOut(rdf.type, code.EcmaScript)
            .addOut(code.link, graph.namedNode('node:@hydrofoil/knossos/resource#DELETE'))
        })
    })
}

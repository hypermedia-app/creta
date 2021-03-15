import clownface, { GraphPointer } from 'clownface'
import { NamedNode } from 'rdf-js'
import $rdf from 'rdf-ext'
import { dcterms, foaf, hydra, rdf, rdfs, sh, vcard, xsd } from '@tpluscode/rdf-ns-builders'
import { acl, auth, code } from '@hydrofoil/labyrinth/lib/namespace'
import RdfResource from '@tpluscode/rdfine'
import { NodeShapeBundle, PropertyShapeBundle } from '@rdfine/shacl/bundles'
import { fromPointer as initCollection } from '@rdfine/hydra/lib/Collection'
import { fromPointer as initNodeShape } from '@rdfine/shacl/lib/NodeShape'
import { NamespaceBuilder } from '@rdfjs/namespace'
import { knossos } from './namespace'

RdfResource.factory.addMixin(...NodeShapeBundle)
RdfResource.factory.addMixin(...PropertyShapeBundle)

interface Namespaces {
  api: NamespaceBuilder
  root: NamespaceBuilder
}

function resourcePUT(operation: GraphPointer) {
  return operation
    .addOut(hydra.method, 'PUT')
    .addOut(auth.access, acl.Write)
    .addOut(code.implementedBy, implementation => {
      implementation
        .addOut(rdf.type, code.EcmaScript)
        .addOut(code.link, $rdf.namedNode('node:@hydrofoil/knossos/resource#PUT'))
    })
}

export function ApiDocumentation(api: NamedNode, { root }: Namespaces): GraphPointer<NamedNode> {
  const graph = clownface({ dataset: $rdf.dataset() })

  graph.node(hydra.Resource)
    .addOut(hydra.supportedOperation, operation => {
      operation
        .addOut(hydra.method, 'GET')
        .addOut(auth.access, acl.Read)
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
        .addOut(auth.access, acl.Read)
        .addOut(code.implementedBy, implementation => {
          implementation
            .addOut(rdf.type, code.EcmaScript)
            .addOut(code.link, graph.namedNode('node:@hydrofoil/labyrinth/collection#get'))
        })
    })

  return graph.node(api)
    .addOut(rdf.type, hydra.ApiDocumentation)
    .addOut(hydra.entrypoint, graph.namedNode(root()))
}

export function Entrypoint({ api }: Namespaces): GraphPointer<NamedNode> {
  return clownface({ dataset: $rdf.dataset() })
    .namedNode(api())
    .addOut(rdf.type, hydra.Resource)
}

export function ClassesCollection({ api }: Namespaces): GraphPointer<NamedNode> {
  const pointer = clownface({ dataset: $rdf.dataset() })
    .namedNode(api.classes)

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
    .addOut(hydra.supportedOperation, resourcePUT)
    .addOut(hydra.supportedOperation, operation => {
      operation
        .addOut(hydra.method, 'DELETE')
        .addOut(auth.access, acl.Delete)
        .addOut(code.implementedBy, implementation => {
          implementation
            .addOut(rdf.type, code.EcmaScript)
            .addOut(code.link, graph.namedNode('node:@hydrofoil/knossos/resource#DELETE'))
        })
    })
}

export function * AclResources({ api }: Namespaces): Generator<GraphPointer<NamedNode>> {
  const Authorization = clownface({ dataset: $rdf.dataset() })
    .namedNode(acl.Authorization)
    .addOut(rdf.type, [sh.NodeShape, rdfs.Class, hydra.Class])
    .addOut(knossos.createWithPUT, true)
    .addOut(hydra.supportedOperation, resourcePUT)

  const Group = clownface({ dataset: $rdf.dataset() })
    .namedNode(api._AuthorizationGroup)
    .addOut(rdf.type, [sh.NodeShape, rdfs.Class, hydra.Class])

  initNodeShape(Group, {
    property: [{
      path: rdf.type,
      hasValue: vcard.Group,
    }, {
      path: vcard.hasUID,
      minCount: 1,
      maxCount: 1,
      pattern: '^urn:uuid:',
      nodeKind: sh.IRI,
    }, {
      path: dcterms.created,
      datatype: xsd.dateTime,
      maxCount: 1,
    }, {
      path: dcterms.modified,
      datatype: xsd.dateTime,
      maxCount: 1,
    }, {
      path: vcard.hasMember,
      nodeKind: sh.IRI,
    }],
  })

  initNodeShape(Authorization, {
    property: [{
      path: rdf.type,
      hasValue: acl.Authorization,
    }, {
      path: acl.mode,
      minCount: 1,
      in: [acl.Read, acl.Write, acl.Control, acl.Delete, acl.Create],
    }],
    or: [{
      property: {
        path: acl.agent,
        maxCount: 1,
        minCount: 1,
        nodeKind: sh.IRI,
      },
    }, {
      property: {
        path: acl.agentClass,
        maxCount: 1,
        minCount: 1,
        nodeKind: sh.IRI,
      },
    }, {
      property: {
        path: acl.agentGroup,
        minCount: 1,
        class: Group,
      },
    }],
  })

  initNodeShape(Authorization, {
    or: [{
      property: {
        path: acl.accessTo,
        minCount: 1,
        nodeKind: sh.IRI,
      },
    }, {
      property: {
        path: acl.accessToClass,
        minCount: 1,
        nodeKind: sh.IRI,
      },
    }],
  })

  yield Authorization
  yield Group
}

export function SystemUser({ root }: Namespaces): GraphPointer<NamedNode> {
  return clownface({ dataset: $rdf.dataset() })
    .namedNode(root('user/SYSTEM'))
    .addOut(rdf.type, [foaf.Agent, knossos.SystemAccount])
}

export function * SystemAuthorizations({ api }: Namespaces): Generator<GraphPointer<NamedNode>> {
  yield clownface({ dataset: $rdf.dataset() })
    .namedNode(api('authorization/system-controls-defaults'))
    .addOut(rdf.type, acl.Authorization)
    .addOut(acl.accessToClass, [hydra.Class, hydra.Resource, acl.Authorization])
    .addOut(acl.mode, acl.Control)
    .addOut(acl.agentClass, knossos.SystemAccount)
}

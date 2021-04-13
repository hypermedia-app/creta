# @hydrofoil/creta

> [!WARNING]
> Project Creta as well as this documentation is an early work-in-progress. Expect changes

Creta is a set of projects which aim to make it very simple to build low-code, [data-centric][dc] [Hydra APIs][hydra] using node.js and a set of other open web standards:

* [SPARQL](https://www.w3.org/TR/sparql11-overview/)
* [Web Access Control](https://github.com/solid/web-access-control-spec)
* [Activity Streams](http://www.w3.org/TR/activitystreams-core/)
* [Problem Document (RFC 7807)](https://tools.ietf.org/html/rfc7807)

[dc]: https://tdan.com/the-data-centric-revolution-data-centric-vs-data-driven/20288
[hydra]: http://www.hydra-cg.com/spec/latest/core/

The project consists of multiple components, which can be combined according to specific needs:

## Core packages

### @hydrofoil/labyrinth

> [!TIP]
> Named after the [mythical Cretan maze](https://www.wikidata.org/wiki/Q1091243), home of the [Minotaur](https://www.wikidata.org/wiki/Q129866)

Core server library, which is the foundation for express-based Hydra APIs. It builds upon [hydra-box](https://npm.im/hydra-box) by providing read-only capabilities using a convention-over-configuration approach and core error-handling functionality.

The core piece missing from `labyrinth` is loading the actual contents of `hydra:ApiDocumentation` which drives client-server interactions. That is to keep the core agnostic of how the API's final functionality is deployed.

### @hydrofoil/knossos

> [!TIP]
> Named after the [ancient Cretan city](https://www.wikidata.org/wiki/Q173527), located near the modern day [Heraklion](https://www.wikidata.org/wiki/Q160544)

`knossos` complements `labyrinth` by providing a SPARQL loader of the API Documentation. That way the API Documentation lives in the same database as the rest of the resources, which means that it can be modified without.

Other integrated features are:

* all-you-need write handlers for resources and `hydra:Collection` members,
* SHACL validation middleware,
* data-centric eventing via `@hydrofoil/knossos-events`,
* ACL via [hydra-box-web-access-control](https://npm.im/hydra-box-web-access-control)
* administrative system account access.

### @hydrofoil/minotaur

> [!TIP]
> Named after the [mythical creature](https://www.wikidata.org/wiki/Q129866) who inhabited [the maze](https://www.wikidata.org/wiki/Q1091243) located at the centre of [Knossos palace](https://www.wikidata.org/wiki/Q173527)

As an alternative to `knossos`, `minotaur` comes with a filesystem loader of the API Documentation.

## Auxiliary packages

### (Coming soon) @hydrofoil/talos

> [!TIP]
> Named after a mythical giant who guarded Crete by throwing great boulders at approaching enemies

Talos is a CLI tool which can be used to boostrap initial resources inside a triple store for a `knossos`/`labyrinth` to serve.

### @hydrofoil/knossos-events

Configure domain-event handlers by declaratively annotating data structures directly, in a data-centric fashion.

### @hydrofoil/namespaces

Exports RDF/JS namespace builders of vocabularies used by the other packages.

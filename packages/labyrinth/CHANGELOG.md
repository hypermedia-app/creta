# @hydrofoil/labyrinth

## 0.13.4

### Patch Changes

- 949fc8b: build(deps): bump hydra-box from 0.6.5 to 0.6.6

## 0.13.3

### Patch Changes

- 454dc08: Loading code referred from `code:arguments` would fail because it resolved incorrect module path

## 0.13.2

### Patch Changes

- 03d7bcb: build(deps): bump @tpluscode/sparql-builder from 0.3.22 to 0.3.23
- 323edb2: Missing package metadata

## 0.13.1

### Patch Changes

- 6870988: build(deps): bump sparql-http-client from 2.4.0 to 2.4.1
- 37642c3: Looking up `hydra:supportedProperty` was very slow because it potentially returned a large result of useless links

## 0.13.0

### Minor Changes

- 8d360ac: **BREAKING** combine `ResourceHook` params in a single object to simplify future extensions
- 01cda12: **BREAKING** Removes `ToSparqlPatterns` interface. Instead, `import { Filter } from '@hydrofoil/labyrinth/query'`

### Patch Changes

- 8bb9f2c: `Filter` should be generic
- 8720692: `query:filter` were not loaded correctly

## 0.12.0

### Minor Changes

- 0ec3dde: All code references in RDF must use `code:implementedBy`

  Affected predicates:

  - `knossos:beforeSave`
  - `knossos:preprocessPayload`
  - `knossos:preprocessResource`
  - `knossos:preprocessResponse`
  - `query:filter`

  For example, a which query used to be

  ```turtle
  prefix code: <https://code.described.at/>
  prefix query: <https://hypermedia.app/query#>

  [
    query:filter
    [
      a code:EcmaScriptModule ;
      code:link <file:filters/articles/title.js#startsWith> ;
    ] ;
  ] .
  ```

  must now become

  ```turtle
  prefix code: <https://code.described.at/>
  prefix query: <https://hypermedia.app/query#>

  [
    query:filter
    [
      code:implementedBy
        [
          a code:EcmaScriptModule ;
          code:link <file:filters/articles/title.js#startsWith> ;
        ] ;
    ] ;
  ] .
  ```

### Patch Changes

- 0ec3dde: Implicitly filter collection using an exact pattern (closes #386)
- 0ec3dde: Resource hooks support for `code:arguments`
- 0ec3dde: Add a variable factory to query filter function. Use it to avoid clashes of variable names
- 0ec3dde: Loading `code:arguments` for collection filter mappings

## 0.11.3

### Patch Changes

- ddbc61b: Update `@tpluscode/rdf-ns-builders` to v2

## 0.11.2

### Patch Changes

- ca13ab0: Added `req.labyrinth.fullRepresentation()` for loading resource triples, including `query:include` annotations
- 017d95b: Customizable strategy for header `Prefer: return=minimal`
- 017d95b: Freeze labyrinth configuration object
- b29faf8: build(deps): bump clownface-shacl-path from 1.3.0 to 1.3.1
- 3f945d2: build(deps): bump express from 4.17.3 to 4.18.1
- a62c7b3: Default collection GET handler now supports eager-loading resources using `query:include`. Fixes #304
- 017d95b: `Prefer: return=minimal` supoorted by default getter of `hydra:Collection`

## 0.11.1

### Patch Changes

- b958949: Eager-loading linked resources would inadvertently remove collection members if linked were blank nodes

## 0.11.0

### Minor Changes

- 718e311: Remove support for `query:restrict` from resource `GET` handler

### Patch Changes

- 718e311: Resource and its links retrieved in single `DESCRIBE` query
- 036a42b: Some linked resources would not have been eager-loaded by `query:include` if they were not present in the current resource's graph

## 0.10.8

### Patch Changes

- a62012a: `Prefer: return=minimal` should only use resource's own graph as query context
- 6d8f891: build(deps): bump clownface from 1.4.0 to 1.5.1
- 4caf075: build(deps): bump @tpluscode/sparql-builder from 0.3.18 to 0.3.21

## 0.10.7

### Patch Changes

- dd38eb1: Log executed resource hooks

## 0.10.6

### Patch Changes

- 6eb5d10: Updated hydra-box (now with support for `code:EcmaScriptModule`)

## 0.10.5

### Patch Changes

- 593b209: build(deps): bump debug from 4.3.3 to 4.3.4
- 2dee5cd: build(deps): bump @tpluscode/rdfine from 0.5.37 to 0.5.38

## 0.10.4

### Patch Changes

- bdaad8b: `req.labyrinth` was undefined when `before` middlewares were executed

## 0.10.3

### Patch Changes

- 522dba6: Linked resources: it is now possible to have multiple `query:path` on `query:include` and `query:memberInclude`
- 100becd: Resource#GET: In case of some `query:include` paths, resources would be `DESCRIBE`-d twice, causing duplicate blank nodes

## 0.10.2

### Patch Changes

- 0531189: If a `memberInclude` matches nothing, collection may be returned incomplete

## 0.10.1

### Patch Changes

- cb26eaa: Support member assertions on collection types when dereferencing collections (closes #74)
- 722af56: build(deps): bump hydra-box from 0.6.3 to 0.6.4

## 0.10.0

### Minor Changes

- a703a72: Significant refactoring of collection GET handler

### Patch Changes

- 2fd978f: build(deps): bump express from 4.17.2 to 4.17.3
- 81fd1ce: Explicitly represented template would produce invalid URIs when the query values contained reserved characters
- 4651a19: Collection query would have same pattern multiple times when declared multiple times

## 0.10.0-alpha.2

### Patch Changes

- 81fd1ce: Explicitly represented template would produce invalid URIs when the query values contained reserved characters

## 0.10.0-alpha.1

### Patch Changes

- 4651a19: Collection query would have same pattern multiple times when declared multiple times

## 0.10.0-alpha.0

### Minor Changes

- a703a72: Significant refactoring of collection GET handler

## 0.9.1

### Patch Changes

- dabaac9: Last page was incorrectly caluclated when collection had even nuber of members
- 3ea2ce7: Preserve `page=1` when calculating first page URI (fixes #247)

## 0.9.0

### Minor Changes

- 49d8416: Eager loading must be defined using `query:path`
- d97aec5: Rename property used with collections to `query:memberInclude`

### Patch Changes

- b98248d: Getting linked resources did not return all values
- f6ffb3c: build(deps): bump @tpluscode/sparql-builder from 0.3.14 to 0.3.18

## 0.8.4

### Patch Changes

- 81648a7: Creating collection members should call `knossos:preprocessResponse` hooks

## 0.8.3

### Patch Changes

- ec30d0b: build(deps): bump express from 4.17.1 to 4.17.2
- 87aa7a6: Not all errors responses were valid JSON-LD

## 0.8.2

### Patch Changes

- fadb644: build(deps): bump sparql-http-client from 2.2.3 to 2.4.0
- ff74df9: Updated http-errors to v2.0.0
- 1692ad1: build(deps): bump @tpluscode/rdf-ns-builders from 1.0.0 to 1.1.0

## 0.8.1

### Patch Changes

- 70842bc: Apply `knossos:preprocessPayload` hooks when creating collection members based on `hydra:memberAssertion`

## 0.8.0

### Minor Changes

- c226b3b: - Remove interface `Enrichment`
  - Introduce three kinds of hooks to modify the payload, resource, and response
- c226b3b: Update @hydrofoil/vocabularies

### Patch Changes

- a5124b8: build(deps): bump clownface-shacl-path from 1.2.2 to 1.3.0

## 0.7.5

### Patch Changes

- 9905aae: Update `@tpluscode/rdf-string`

## 0.7.4

### Patch Changes

- 0245377: Re-export `Enrichment` to simplify usage
- ebfccd1: Support complex paths in `query:include`

## 0.7.3

### Patch Changes

- 3f2d7e3: build(deps): bump rdf-ext from 1.3.1 to 1.3.5

## 0.7.2

### Patch Changes

- f53c7ac: Add `rdf:type hydra:Error` to problem+json responses

## 0.7.1

### Patch Changes

- a881cbb: Error responses are valid JSON-LD

## 0.7.0

### Minor Changes

- 26f731b: BREAKING: CORS middleware is not set up by default
- 26f731b: Removed ApiFactory

### Patch Changes

- 178f7fc: Updated @rdfine/hydra

## 0.6.6

### Patch Changes

- 763d1a1: Feature to eager-load related resources using SHACL paths

## 0.6.5

### Patch Changes

- 4bd7d7a: Support `GRAPH ?member` when member assertion is annotated with `knossos:ownGraphOnly`

## 0.6.4

### Patch Changes

- a973a56: Static collection member were not being loaded

## 0.6.3

### Patch Changes

- acc2bbd: Ability to serve collections which contain a static set of `hydra:member`

## 0.6.2

### Patch Changes

- 53ef91d: `hydra:memberAssertion` would not be applied if it had mutliple objects of any of its properties

## 0.6.1

### Patch Changes

- b3e24eb: Upgrade `@hydrofoil/vocabularies`

## 0.6.0

### Minor Changes

- ff74998: Eager loading annotated by `query:include` must use `DESCRIBE` like the rest of queries

### Patch Changes

- 511b6c8: Missing id of collection's `PartialCollectionView`

## 0.5.5

### Patch Changes

- d0bcd09: Client-defined `hydra:limit` from query string

## 0.5.4

### Patch Changes

- ed116d8: Ordering collections by annotating instances

## 0.5.3

### Patch Changes

- 1aebd6c: Operation would not be found if an object would have been used in multiple relations, if not all were supported properties

## 0.5.2

### Patch Changes

- 7609e41: Update depdendencies

## 0.5.1

### Patch Changes

- 2701b91: Empty collection failed to dereference

## 0.5.0

### Minor Changes

- e195d2f: Breaking: Use `DESCRIBE` query form to get collection members
- 8df3380: Breaking changes:
  - Extracted `protectedResource` export to package `@hydrofoil/labyrinth-jwt-permissions`
    - Removed all `auth` features from core
  - Decoupled logic creating hydra-box API
    - `@hydrofoil/minotaur` loads local RDF files
    - `@hydrofoil/knossos` loads `hydra:ApiDocumentation` from store
  - default `SparqlQueryLoader` uses default graph (assumes Union Graph is queries)

### Patch Changes

- a083172: Add support for `Prefer: return=minimal` to only select from own graph
- ea1fab4: Operation middleware to resolve ambiguous operation by selecting operation supported by most derived class

## 0.4.1

### Patch Changes

- 2776e2f: API path was incorrect when routing in sub-path

## 0.4.0

### Minor Changes

- f313671: Use internal router instead of attaching to main express app
- cd5ddeb: Use typings package for hydra-box

## 0.3.0

### Minor Changes

- 46df97a: Update hydra-box improves operation finding performance

## 0.2.0

### Minor Changes

- fa1d02a: Handle errors explicitly using a new module

## 0.1.18

### Patch Changes

- 1547037: Add error middleware extension point

## 0.1.17

### Patch Changes

- c556e45: Add log to the operation filter middleware

## 0.1.16

### Patch Changes

- fd8c7f1: Update rdfine

## 0.1.15

### Patch Changes

- 3c8390d: Non-hydra operations would be superfluously removed by middleware

## 0.1.14

### Patch Changes

- 7038c1c: Fix filtering of hydra Class operations

## 0.1.13

### Patch Changes

- d1044c9: Add full support for hydra-box middlewares

## 0.1.12

### Patch Changes

- 2fca756: More ways to eager-load collection members

## 0.1.11

### Patch Changes

- 5d6b2f1: Existing error mappers were not being replaced

## 0.1.10

### Patch Changes

- 84ef37b: Update rdfine

## 0.1.9

### Patch Changes

- correctly set api documentation url

## 0.1.8

### Patch Changes

- 091ad2c: Always use base url for api documentation URL

## 0.1.7

- Improve authorization

## 0.1.6

### Patch Changes

- 86bf5ed: Make default API Documentation base URI configurable
- SPARQL parameters should allow undefined store/graph URLs

## 0.1.5

### Patch Changes

- 1581f54: Allow protecting resources using scopes and also protect on type level
- 0540564: Controlling collection pages with template query params
- 6ae2ed3: Page size should be configurable as default, per-collection type and collection itself
- d360175: Collection should return empty when there is no manages block

## 0.1.4

### Patch Changes

- 80f2183: Fix usages of app.sparql

## 0.1.2

### Patch Changes

- f90de11: Initialize a streaming client on app.locals

## 0.1.1

### Patch Changes

- e7e70b2: Simplify loader constructor
- 5a1db92: labyrinth would not catch errors from preceeding middlewares

## 0.1.0

### Minor Changes

- b217323: Initial publish

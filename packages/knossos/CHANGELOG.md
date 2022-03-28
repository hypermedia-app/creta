# @hydrofoil/knossos

## 0.6.3

### Patch Changes

- 3c096fc: build(deps): bump express-middleware-shacl from 1.1.4 to 1.1.5
- Updated dependencies [522dba6]
- Updated dependencies [100becd]
  - @hydrofoil/labyrinth@0.10.3

## 0.6.2

### Patch Changes

- c41a049: build(deps): bump @rdfjs-elements/formats-pretty from 0.4.2 to 0.4.3
- f62fe40: build(deps): bump fs-extra from 10.0.0 to 10.0.1
- 722af56: build(deps): bump hydra-box from 0.6.3 to 0.6.4
- 3d1af89: Support member assertions on collection types when creating collections members (closes #74)
- Updated dependencies [cb26eaa]
- Updated dependencies [722af56]
  - @hydrofoil/labyrinth@0.10.1

## 0.6.1

### Patch Changes

- 2fd978f: build(deps): bump express from 4.17.2 to 4.17.3
- 8b7192c: build(deps): bump commander from 7.2.0 to 9.0.0
- 09b0f72: build(deps): bump hydra-box-web-access-control from 1.1.4 to 1.1.5
- Updated dependencies [2fd978f]
- Updated dependencies [a703a72]
- Updated dependencies [81fd1ce]
- Updated dependencies [4651a19]
  - @hydrofoil/knossos-events@0.3.4
  - @hydrofoil/labyrinth@0.10.0

## 0.6.1-alpha.0

### Patch Changes

- Updated dependencies [a703a72]
  - @hydrofoil/labyrinth@0.10.0-alpha.0

## 0.6.0

### Minor Changes

- 4ecd90a: Bump because labyrinth had breaking change

### Patch Changes

- d1fe287: build(deps): bump @rdfjs-elements/formats-pretty from 0.4.0 to 0.4.2
- f6ffb3c: build(deps): bump @tpluscode/sparql-builder from 0.3.14 to 0.3.18
- d289cd9: build(deps): bump nanoid from 3.1.30 to 3.2.0
- Updated dependencies [b98248d]
- Updated dependencies [f6ffb3c]
- Updated dependencies [d289cd9]
- Updated dependencies [49d8416]
- Updated dependencies [d97aec5]
  - @hydrofoil/labyrinth@0.9.0
  - @hydrofoil/knossos-events@0.3.3

## 0.5.4

### Patch Changes

- 81648a7: Creating collection members should call `knossos:preprocessResponse` hooks
- Updated dependencies [81648a7]
  - @hydrofoil/labyrinth@0.8.4

## 0.5.3

### Patch Changes

- ec30d0b: build(deps): bump express from 4.17.1 to 4.17.2
- Updated dependencies [ec30d0b]
- Updated dependencies [87aa7a6]
  - @hydrofoil/knossos-events@0.3.2
  - @hydrofoil/labyrinth@0.8.3

## 0.5.2

### Patch Changes

- fdc6d68: SHACL middleware did not validated against nested shapes
- fadb644: build(deps): bump sparql-http-client from 2.2.3 to 2.4.0
- ff74df9: Updated http-errors to v2.0.0
- 1692ad1: build(deps): bump @tpluscode/rdf-ns-builders from 1.0.0 to 1.1.0
- Updated dependencies [fadb644]
- Updated dependencies [ff74df9]
- Updated dependencies [1692ad1]
  - @hydrofoil/labyrinth@0.8.2
  - @hydrofoil/knossos-events@0.3.1

## 0.5.1

### Patch Changes

- 70842bc: Apply `knossos:preprocessPayload` hooks when creating collection members based on `hydra:memberAssertion`
- Updated dependencies [70842bc]
  - @hydrofoil/labyrinth@0.8.1

## 0.5.0

### Minor Changes

- c226b3b: Update @hydrofoil/vocabularies

### Patch Changes

- Updated dependencies [c226b3b]
- Updated dependencies [a5124b8]
- Updated dependencies [c226b3b]
  - @hydrofoil/labyrinth@0.8.0
  - @hydrofoil/knossos-events@0.3.0

## 0.4.6

### Patch Changes

- be2ad8d: Support `knossos:memberTemplate` set on collection instance (closes #137)
- c95cfeb: Use express router's base path when creating new member identifiers (fixes #196)
- 9905aae: Update `@tpluscode/rdf-string`
- 30417b2: `hydra:memberAssertion` should be applied before SHACL validation
- Updated dependencies [9905aae]
  - @hydrofoil/knossos-events@0.2.6
  - @hydrofoil/labyrinth@0.7.5

## 0.4.5

### Patch Changes

- 3353082: build(deps): bump nanoid from 3.1.25 to 3.1.30
- af6699c: Updated parsers to use latest JSON-LD
- Updated dependencies [0245377]
- Updated dependencies [3353082]
- Updated dependencies [ebfccd1]
- Updated dependencies [9a48ab6]
- Updated dependencies [c7f6a28]
  - @hydrofoil/labyrinth@0.7.4
  - @hydrofoil/knossos-events@0.2.5

## 0.4.4

### Patch Changes

- c351927: Route path would not match root even if optional

## 0.4.3

### Patch Changes

- 3f2d7e3: build(deps): bump rdf-ext from 1.3.1 to 1.3.5
- f1860ff: build(deps): bump express-middleware-shacl from 1.1.2 to 1.1.4
- 4e070c4: Added `--routeRegex` option
- Updated dependencies [3f2d7e3]
  - @hydrofoil/knossos-events@0.2.4
  - @hydrofoil/labyrinth@0.7.3

## 0.4.2

### Patch Changes

- b5b62f3: ApiDocumentation link should be constructed with `X-Forwarded-Prefix` header when set

## 0.4.1

### Patch Changes

- 8191e41: Support hosting APIs on subpaths and not only domains

## 0.4.0

### Minor Changes

- 86e8950: Export a middleware for manual setup

### Patch Changes

- 76e5881: build(deps): bump express-rdf-request from 1.1.0 to 1.1.1

## 0.3.2

### Patch Changes

- 7276f13: All providing additional authorization patterns to `rdf-web-access-control`

## 0.3.1

### Patch Changes

- b70863e: Collection member would not be validated if it did not have an explicit `rdf:type`. Now types from `hydra:memberAssertion` will be used to select classes to validate

## 0.3.0

### Minor Changes

- 26f731b: All consumer middleware must be defined in resource graph

  BREAKING CHANGE:

  With the `--authModule` CLI option now gone, authentication middleware now has to be linked from a configuration resource. See [docs](https://creta.hypermedia.app/#/knossos/auth) for details.

- 384cf21: Remove explicit `hydra:apiDocumentation`
- 26f731b: BREAKING: CORS middleware is not set up by default

### Patch Changes

- 178f7fc: Updated @rdfine/hydra
- Updated dependencies [26f731b]
- Updated dependencies [178f7fc]
- Updated dependencies [26f731b]
  - @hydrofoil/labyrinth@0.7.0

## 0.2.5

### Patch Changes

- 636ba4a: Multi-tenancy: serving multiple APIs from one process
- Updated dependencies [a973a56]
  - @hydrofoil/labyrinth@0.6.4

## 0.2.4

### Patch Changes

- 8c6fc87: Multi-tenancy: ApiDocumentation terms leak between APIs
- fcd3619: Supported operations should also be loaded when class is not explicitly `hydra:Class`

## 0.2.3

### Patch Changes

- b3e24eb: Replace `knossos:supportedByClass` with `knossos:supportedBy`
- Updated dependencies [b3e24eb]
- Updated dependencies [b3e24eb]
  - @hydrofoil/labyrinth@0.6.1
  - @hydrofoil/knossos-events@0.2.3

## 0.2.2

### Patch Changes

- 30dbfa6: Shape for `vcard:Group` should not be a `hydra:Class`
- Updated dependencies [511b6c8]
- Updated dependencies [ff74998]
  - @hydrofoil/labyrinth@0.6.0

## 0.2.1

### Patch Changes

- c9385e9: Add `knossos-ts` bin for supporting TypeScript imports
- Updated dependencies [ed116d8]
  - @hydrofoil/labyrinth@0.5.4

## 0.2.0

### Minor Changes

- 73ca0a8: Filter ACL to only coonsider those with `hydra:apiDocumentation` property
- 090d840: Collection#CreateMember must respond with full representation
- ea8c6f9: Requires SHACL shape resources to have `hydra:apiDocumentation` property

### Patch Changes

- 634fd08: Not all member assertions were added to collection members
- 233b408: API documentation excludes classes which do not have a `hydra:supportedOperation`

  This caused classes which only had a `hydra:supportedProperty` to not appear in the `ApiDocumentation` resource

- 4cf1b24: Api Documentation would not load operations supported by properties
- Updated dependencies [63f9362]
  - @hydrofoil/knossos-events@0.2.1

## 0.1.4

### Patch Changes

- c029c37: Variable transformation modified original resource
- Updated dependencies [fa6ce84]
  - @hydrofoil/knossos-events@0.2.0

## 0.1.3

### Patch Changes

- 2de1da3: Base path needs to be passed to loader
- Updated dependencies [36470b5]
  - @hydrofoil/knossos-events@0.1.1

## 0.1.2

### Patch Changes

- 246d269: Transform variables when creating member identifiers
- Updated dependencies [2701b91]
  - @hydrofoil/labyrinth@0.5.1

## 0.1.1

### Patch Changes

- b4906f2: SHACL - subclasses were not included when retrieving sh:targetClass shapes
- 699c630: Collection#CreateMember - do not load shape of collection itself
- 3f6cdb8: CLI command would fail on syntax error

## 0.1.0

### Minor Changes

- 8ca0bbf: CLI command `init` outputs nicely formatted turtle
- 8df3380: First version

### Patch Changes

- Updated dependencies [a083172]
- Updated dependencies [ea1fab4]
- Updated dependencies [e195d2f]
- Updated dependencies [171517e]
- Updated dependencies [8df3380]
  - @hydrofoil/labyrinth@0.5.0
  - @hydrofoil/knossos-events@0.1.0

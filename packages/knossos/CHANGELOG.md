# @hydrofoil/knossos

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

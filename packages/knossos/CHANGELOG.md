# @hydrofoil/knossos

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

# @hydrofoil/talos

## 0.4.0

### Minor Changes

- c226b3b: Update @hydrofoil/vocabularies

### Patch Changes

- Updated dependencies [c226b3b]
  - @hydrofoil/knossos@0.5.0

## 0.3.12

### Patch Changes

- 9905aae: Update `@tpluscode/rdf-string`
- Updated dependencies [be2ad8d]
- Updated dependencies [c95cfeb]
- Updated dependencies [9905aae]
- Updated dependencies [30417b2]
  - @hydrofoil/knossos@0.4.6

## 0.3.11

### Patch Changes

- 3f2d7e3: build(deps): bump rdf-ext from 1.3.1 to 1.3.5
- Updated dependencies [3f2d7e3]
- Updated dependencies [f1860ff]
- Updated dependencies [4e070c4]
  - @hydrofoil/knossos@0.4.3

## 0.3.10

### Patch Changes

- b51f8bf: Improvements in resolving relative paths in resources

## 0.3.9

### Patch Changes

- f83a915: `index.ttl` in root resource directory would add a trailing slash to resource URI

## 0.3.8

### Patch Changes

- 3066a74: Only first occurrence of an absolute path URI would hve been correctly rebased

## 0.3.7

### Patch Changes

- 4287aa7: Absolute paths were not correctly resolved when base URL had a path

## 0.3.6

### Patch Changes

- Updated dependencies [86e8950]
- Updated dependencies [76e5881]
  - @hydrofoil/knossos@0.4.0

## 0.3.5

### Patch Changes

- Updated dependencies [26f731b]
- Updated dependencies [384cf21]
- Updated dependencies [26f731b]
- Updated dependencies [178f7fc]
  - @hydrofoil/knossos@0.3.0

## 0.3.4

### Patch Changes

- 432ec61: `put`: skip invalid directories with warning

## 0.3.3

### Patch Changes

- bd43f68: Dots in resource path caused the URI to be cut short

## 0.3.2

### Patch Changes

- 6d68a5d: Resource paths were not encoded which caused Bad Request on SPARQL Update if they contained spaces or other characters not allowed in URLs

## 0.3.1

### Patch Changes

- b3e24eb: Upgrade `@hydrofoil/vocabularies`
- Updated dependencies [b3e24eb]
  - @hydrofoil/knossos@0.2.3

## 0.3.0

### Minor Changes

- 2883c1c: Split `put --resources` and `put --vocabs` into separate commands

## 0.2.1

### Patch Changes

- ad1932f: Add option to put additional vocabs from compatible packages

## 0.2.0

### Minor Changes

- c51aa59: Add `hydra:apiDocumentation` to bootstrapped resources

## 0.1.2

### Patch Changes

- Updated dependencies [73ca0a8]
- Updated dependencies [634fd08]
- Updated dependencies [233b408]
- Updated dependencies [090d840]
- Updated dependencies [4cf1b24]
- Updated dependencies [ea8c6f9]
  - @hydrofoil/knossos@0.2.0

## 0.1.1

### Patch Changes

- 3f6cdb8: CLI command would fail on syntax error
- Updated dependencies [b4906f2]
- Updated dependencies [699c630]
- Updated dependencies [3f6cdb8]
  - @hydrofoil/knossos@0.1.1

## 0.1.0

### Minor Changes

- 8df3380: First version
- 2a8cebf: SHACL vocabulary inserted by default

### Patch Changes

- Updated dependencies [8ca0bbf]
- Updated dependencies [8df3380]
  - @hydrofoil/knossos@0.1.0

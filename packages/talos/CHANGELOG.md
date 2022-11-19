# @hydrofoil/talos

## 0.5.0

### Minor Changes

- 7f52095: Resources across multiple source directories are now merged in memory and saved as a whole (resolves #271)

## 0.4.17

### Patch Changes

- 0792046: Option to skip resources which already exist
- Updated dependencies [dd368d1]
  - @hydrofoil/knossos@0.9.7

## 0.4.16

### Patch Changes

- 03d7bcb: build(deps): bump @tpluscode/sparql-builder from 0.3.22 to 0.3.23
- 323edb2: Missing package metadata
- Updated dependencies [278f654]
- Updated dependencies [03d7bcb]
- Updated dependencies [323edb2]
  - @hydrofoil/knossos@0.9.4

## 0.4.15

### Patch Changes

- 6870988: build(deps): bump sparql-http-client from 2.4.0 to 2.4.1
- 6ab0d14: build(deps): bump commander from 9.3.0 to 9.4.0
- Updated dependencies [6870988]
- Updated dependencies [6ab0d14]
  - @hydrofoil/knossos@0.9.3

## 0.4.14

### Patch Changes

- Updated dependencies [ce82f9c]
  - @hydrofoil/knossos@0.9.0

## 0.4.13

### Patch Changes

- Updated dependencies [0ec3dde]
- Updated dependencies [0ec3dde]
  - @hydrofoil/knossos@0.8.0

## 0.4.12

### Patch Changes

- ab4c5c3: build(deps): bump mime-types from 2.1.34 to 2.1.35
- ddbc61b: Update `@tpluscode/rdf-ns-builders` to v2
- Updated dependencies [a024e38]
- Updated dependencies [ddbc61b]
  - @hydrofoil/knossos@0.7.2

## 0.4.11

### Patch Changes

- 0d5fb28: build(deps): bump commander from 9.2.0 to 9.3.0
- d2051ea: PUT: support trig sources with multiple resources (closes #92)
- Updated dependencies [0d5fb28]
- Updated dependencies [017d95b]
- Updated dependencies [3f945d2]
  - @hydrofoil/knossos@0.7.1

## 0.4.10

### Patch Changes

- Updated dependencies [dbbe731]
- Updated dependencies [5f8fc38]
- Updated dependencies [ee2dfdd]
- Updated dependencies [00713ae]
  - @hydrofoil/knossos@0.7.0

## 0.4.9

### Patch Changes

- b022341: build(deps): bump commander from 9.0.0 to 9.2.0
- d338aec: Separate option for SPARQL Update endpoint
- Updated dependencies [b022341]
  - @hydrofoil/knossos@0.6.12

## 0.4.8

### Patch Changes

- 6d8f891: build(deps): bump clownface from 1.4.0 to 1.5.1
- 4caf075: build(deps): bump @tpluscode/sparql-builder from 0.3.18 to 0.3.21
- Updated dependencies [d0720ea]
- Updated dependencies [6d8f891]
- Updated dependencies [4caf075]
  - @hydrofoil/knossos@0.6.11

## 0.4.7

### Patch Changes

- Updated dependencies [2fbddfc]
- Updated dependencies [6eb5d10]
  - @hydrofoil/knossos@0.6.7

## 0.4.7-queues.0

### Patch Changes

- Updated dependencies [2fbddfc]
  - @hydrofoil/knossos@0.6.7-queues.0

## 0.4.6

### Patch Changes

- 593b209: build(deps): bump debug from 4.3.3 to 4.3.4
- Updated dependencies [593b209]
- Updated dependencies [2dee5cd]
- Updated dependencies [b1b5f81]
  - @hydrofoil/knossos@0.6.5

## 0.4.5

### Patch Changes

- 95bc5f9: HTML tags inside string literals would be modified as if they were URI references
- Updated dependencies [c41a049]
- Updated dependencies [f62fe40]
- Updated dependencies [722af56]
- Updated dependencies [3d1af89]
  - @hydrofoil/knossos@0.6.2

## 0.4.4

### Patch Changes

- 8b7192c: build(deps): bump commander from 7.2.0 to 9.0.0
- 2fc5612: Bump node-fetch to 2.6.7
- 9d61d92: `--apiDoc` option should be optional
- Updated dependencies [2fd978f]
- Updated dependencies [8b7192c]
- Updated dependencies [09b0f72]
  - @hydrofoil/knossos@0.6.1

## 0.4.4-alpha.0

### Patch Changes

- @hydrofoil/knossos@0.6.1-alpha.0

## 0.4.3

### Patch Changes

- 804bd2e: Per-resource option to merge with existing resource graph

## 0.4.2

### Patch Changes

- f6ffb3c: build(deps): bump @tpluscode/sparql-builder from 0.3.14 to 0.3.18
- Updated dependencies [d1fe287]
- Updated dependencies [f6ffb3c]
- Updated dependencies [d289cd9]
- Updated dependencies [4ecd90a]
  - @hydrofoil/knossos@0.6.0

## 0.4.1

### Patch Changes

- fadb644: build(deps): bump sparql-http-client from 2.2.3 to 2.4.0
- 1692ad1: build(deps): bump @tpluscode/rdf-ns-builders from 1.0.0 to 1.1.0
- Updated dependencies [fdc6d68]
- Updated dependencies [fadb644]
- Updated dependencies [ff74df9]
- Updated dependencies [1692ad1]
  - @hydrofoil/knossos@0.5.2

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

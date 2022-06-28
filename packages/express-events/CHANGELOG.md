# @hydrofoil/knossos-events

## 0.3.11

### Patch Changes

- ddbc61b: Update `@tpluscode/rdf-ns-builders` to v2

## 0.3.10

### Patch Changes

- 3f945d2: build(deps): bump express from 4.17.3 to 4.18.1

## 0.3.9

### Patch Changes

- 49223f7: build(deps): bump @hydrofoil/vocabularies from 0.3.0 to 0.3.1

## 0.3.8

### Patch Changes

- d0720ea: build(deps): bump nanoid from 3.3.1 to 3.3.3
- 6d8f891: build(deps): bump clownface from 1.4.0 to 1.5.1
- 4caf075: build(deps): bump @tpluscode/sparql-builder from 0.3.18 to 0.3.21

## 0.3.7

### Patch Changes

- 483a852: When pushing more events from handlers, `as:actor` should be reused from the parent event automatically

## 0.3.6

### Patch Changes

- fd0009e: Additional events returned from handkers did not have `as:actor` and `as:published` set
- e904454: Event handler show TS error when returning `Initializer<Activity>`

## 0.3.5

### Patch Changes

- 2fbddfc: Reimplemented `@hydrofoil/knossos-events` using [queue](https://npm.im/queue)

  This implements a missing feature where cascading events were not being handled and saved

- 11a6f89: Allow handlers to return a single event

## 0.3.5-queues.1

### Patch Changes

- 11a6f89: Allow handlers to return a single event

## 0.3.5-queues.0

### Patch Changes

- 2fbddfc: Reimplemented `@hydrofoil/knossos-events` using [queue](https://npm.im/queue)

  This implements a missing feature where cascading events were not being handled and saved

## 0.3.4

### Patch Changes

- 2fd978f: build(deps): bump express from 4.17.2 to 4.17.3

## 0.3.3

### Patch Changes

- f6ffb3c: build(deps): bump @tpluscode/sparql-builder from 0.3.14 to 0.3.18
- d289cd9: build(deps): bump nanoid from 3.1.30 to 3.2.0

## 0.3.2

### Patch Changes

- ec30d0b: build(deps): bump express from 4.17.1 to 4.17.2

## 0.3.1

### Patch Changes

- 1692ad1: build(deps): bump @tpluscode/rdf-ns-builders from 1.0.0 to 1.1.0

## 0.3.0

### Minor Changes

- c226b3b: Update @hydrofoil/vocabularies

## 0.2.6

### Patch Changes

- 9905aae: Update `@tpluscode/rdf-string`

## 0.2.5

### Patch Changes

- 3353082: build(deps): bump nanoid from 3.1.25 to 3.1.30
- 9a48ab6: Bumped @rdfin/as from 0.2.2 to 0.2.3
- c7f6a28: build(deps): bump @rdfine/hydra from 0.8.1 to 0.8.2

## 0.2.4

### Patch Changes

- 3f2d7e3: build(deps): bump rdf-ext from 1.3.1 to 1.3.5

## 0.2.3

### Patch Changes

- b3e24eb: Replace `knossos:supportedByClass` with `knossos:supportedBy`

## 0.2.2

### Patch Changes

- 83b05db: Handler were loaded too early, causing none to be found

## 0.2.1

### Patch Changes

- 63f9362: `hydra:apiDocumentation` triple added to event handler

## 0.2.0

### Minor Changes

- fa6ce84: Separate EventSource class from operation

## 0.1.1

### Patch Changes

- 36470b5: Immediate handlers would have been called again on request end

## 0.1.0

### Minor Changes

- 171517e: First version

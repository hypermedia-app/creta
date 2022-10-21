# @hydrofoil/creta-labs

## 0.1.6

### Patch Changes

- 7598ee7: `describeStrategy.js`: it is now possible to set the `query:constructShape` in an anonymous class directly in the resource

## 0.1.5

### Patch Changes

- abe0fbc: Describe Strategy which generates a construct from annotated shape
- Updated dependencies [abe0fbc]
- Updated dependencies [7c08048]
  - @hydrofoil/shape-to-query@0.2.0
  - @hydrofoil/labyrinth@0.13.9

## 0.1.4

### Patch Changes

- 422fbbb: Request `Prefer=minimal` when checking for strong etag (`if-match` header)

## 0.1.3

### Patch Changes

- d7c5bf5: Add files missing in package

## 0.1.2

### Patch Changes

- 4eef0f3: Do not redirect when there is no `accept` header
- 943271b: Do not redirect when accept is most `*/*` wildcard
- ed90d77: Cache and preconditons
- Updated dependencies [e62dcba]
- Updated dependencies [db525e7]
  - @hydrofoil/labyrinth@0.13.5

## 0.1.1

### Patch Changes

- b7a87e9: It should be possible not to redirect when callback returns null/undefined

## 0.1.0

### Minor Changes

- 278f654: Export an implementation of knossos middleware which redirects when HTML is requested

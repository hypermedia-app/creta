# @hydrofoil/shape-to-query

## 0.3.2

### Patch Changes

- 7eb7ae4: Support for `sh:oneOrMorePath` and `sh:zeroOrMorePath`

## 0.3.1

### Patch Changes

- 6737111: Add a builder for `DELETE` queries
- 6737111: Depretcate `construct` export. It will be removed in future breaking release. Use `constructQuery` instead

## 0.3.0

### Minor Changes

- d2d5996: Support for deep `sh:node` which get combined with parent property shapes' paths
- d2d5996: Changed the signature of `shapeToPatterns`. Now it returns an object with functions to create full `CONSTRUCT` and `WHERE` clauses and implements the `Iterable<SparqlTemplateResult>` interface

## 0.2.3

### Patch Changes

- 5792668: `FILTER` was added to the `CONSTRUCT` clause when there were multiple `sh:targetClass`

## 0.2.2

### Patch Changes

- b0f42ce: When there are multiple `sh:targetClass`, add an `IN` filter

## 0.2.1

### Patch Changes

- 28fd6df: Add parameter for the root Focus Node to be used instead of variable
- 28fd6df: Export function to generate a simple `CONSTRUCT`
- a0fbb0d: Does not generate patterns for deactivated Property Shapes

## 0.2.0

### Minor Changes

- abe0fbc: Simplest possible support for predicate paths.
  BREAKING: change the options parameter

## 0.1.2

### Patch Changes

- 0686a29: Unterminated pattern caused invalid SPARQL

## 0.1.1

### Patch Changes

- 2097f3e: Missing JS in published package

## 0.1.0

### Minor Changes

- 990a319: First version. Minimal support only for `sh:targetClass`

# @hydrofoil/labyrinth

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

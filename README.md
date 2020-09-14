# @hydrofoil/labyrinth

Labyrinth is an opinionated, batteries-included middleware for setting up a Hydra API with ease in data-centric manner.

It uses [`hydra-box`](https://npm.im/hydra-box) internally and extends it to provide ready to use building blocks for rapid RDF-base API development.

## Installation

```
npm i --save @hydrofoil/labyrinth
```

## Features

* Generic handlers for getting individual resources
  * Eager loading linked resources
  * Resource preprocessor for custom resource logic before handler
* Generic `hydra:Collection` handler
  * Create any collection using `hydra:manages` block
  * Custom filtering
  * Ordering using property paths
  * Paging using `hydra:pageIndex`
* Secured using JWT tokens
  * Permission-based restrictions to operations
  * Restricting select properties or entire classes
* Error handling using `Problem Details for HTTP APIs` ([RFC 7807](https://tools.ietf.org/html/rfc7807))

## Difference from hydra-box

In contrast to `hydra-box` it also makes some limiting assumptions:

1. All resources are stored in triple store in named graph-per resource fashion
2. Labyrinth provides its own loader which does SPARQL `CONSTRUCT` query to load said resources
3. At the moment ApiDocumentation is only loaded from the filesystem. In the future loading from other sources may be added

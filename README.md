# @hydrofoil/labyrinth

Labyrinth is an opinionated, batteries-included middleware for setting up a Hydra API with ease in data-centric manner.

It uses [`hydra-box`](https://npm.im/hydra-box) internally and extends it to provide ready to use building blocks for rapid RDF-base API development.

## Installation

```
npm i --save @hydrofoil/labyrinth
```

## Setting up

Labyrinth exports an async factory function which creates an express handler.

```js
import express from 'express'
import * as path from 'path'
import { hydraBox, SparqlQueryLoader } from '@hydrofoil/labyrinth'

// a SPARQL Query endpoint URL. This would be Fuseki's default
const endpointUrl = 'http://localhost:3030/query'
// base path to load JavaScript code referenced in Api Documentation
const codePath = path.join(__dirname, 'lib')
// path to load the Api Documentation from Turtle files
const apiPath = path.join(__dirname, 'hydra')
// resource loader which retrieves RDF from the triple store
const loader = new SparqlQueryLoader({ endpointUrl })
// base resource namespace
const baseUri = 'http://example.com/'

async function main() {
  const app = express()
    
  app.use(await hydraBox({
    loader,
    codePath,
    apiPath,
    baseUri,
  }))
  
  app.listen(8080)
}

main()
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
   * Another loader can be used
3. At the moment ApiDocumentation is only loaded from the filesystem. In the future loading from other sources may be added

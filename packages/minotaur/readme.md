# @hydrofoil/minotaur

Local filesystem Api Documentation loader for [labyrinth](https://npm.im/@hydrofoil/labyrinth)

## Preparation

You create a directory with Turtle files containing the whole `hydra:ApiDocumentation` resource which will be served linked to all API responses served by `labyrinth`. These files will be parsed when the app starts. A minimal API could be a single file, but multiple are supported loaded form all subdirectories.

```turtle
@base <urn:hydra-box:api> .
@prefix hydra: <http://www.w3.org/ns/hydra/core#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

</api> 
  a hydra:ApiDocumentation ;
  hydra:supportedClass </api/TodoList>, </api/TodoItem> ;
.

</api/TodoItem>
  a hydra:Class ;
  hydra:title "To-do item" ;
.

</api/TodoList>
  a hydra:Class ;
  rdfs:subClassOf hydra:Collection ;
  hydra:title "To-do list" ;
.
```

## Setup

```typescript
import express from 'express'
import { hydraBox } from '@hydrofoil/labyrinth'
import { fromFilesystem } from '@hydrofoil/minotaur'

const app = express()

app.use(await hydraBox({
  loadApi: fromFilesystem({
    apiPath, // directory with the API Documentation sources
    baseUri, // base resource URI
    defaultBase, // (optional) base URL used in RDF sources
  })
}))
```

If the `defaultBase` is provided, use it instead of `@base <urn:hydra-box:api> .` in the API turtle files.

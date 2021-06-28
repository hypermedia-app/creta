# Advanced topics

## Resource before save hooks

> [!API]
> `import type { BeforeSave } from @hydrofoil/knossos/lib/resource`
>
> [Open API docs](/api/interfaces/_hydrofoil_knossos_lib_resource.beforesave.html)

When resources are created or updated, knossos can run user code right before. The hooks can be used to create custom checks on the resources or modify their content which will be stored.

> [!TIP]
> A hook can be async, returning a `Promise`. If request should not proceed, throw an `Error` inside the hook. This can be useful when it would enforce custom resource constraints.

```turtle
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix hydra: <http://www.w3.org/ns/hydra/core#> .
@prefix knossos: <https://hypermedia.app/knossos#> .
@prefix code: <https://code.described.at/> .

<api/Article>
  a hydra:Class ;
  knossos:beforeSave [
    a code:EcmaScript ;
    code:link <file:lib/article#cannotUnpublish> ;
  ] ;
.
```

In this example, the linked code would have to be a path relative to the configured [`codePath`](/api/interfaces/_hydrofoil_knossos_server.options.html#codepath), exporting a function with the matching name. The hypothetical implementation could check the before and after status of a resource and throw if the change is forbidden.

```javascript
import { schema } from '@tpluscode/rdf-ns-builders'
import httpError from 'http-errors'

export function cannotUnpublish({ before, after }) {
  if (before.out(schema.creativeWorkStatus).value === 'Published') {
    if (after.out(schema.creativeWorkStatus).value !== 'Published') {
      throw new httpError.BadRequest('Cannot change status of published article')
    }
  }
}
```

> [!WARNING]
> For the hook to kick-in, the calling handler must not use directly the `req.knossos.store` but import a `save` function
>
> ```javascript
> import { save } from '@hydrofoil/knossos/lib/resource'
> import clownface from 'clownface' 
>
> export async function createWithHooks(req, res, next) {
>    // create the resource    
>    const resource = clownface({ /* ... */ }).namedNode()
>
>    // save it, so that hooks are executed
>    await save({ resource, req })
>
>    // continue with the handler
>    res.sendStatus(200)
> }
> ```

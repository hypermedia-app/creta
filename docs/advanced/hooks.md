# Resource hooks

## Before save hook

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

## Preprocess hooks

> [!API]
> `import type { ResourceHook } from @hydrofoil/labyrinth/resource`
>
> [Open API docs](/api/interfaces/_hydrofoil_labyrinth_resource.ResourceHook.html)

It is possible to intercept resource representations at various stages of the request pipeline to modify their contents. Multiple such hooks exist, distinguished by their respective property used to annotate a supported class.

The snippet below shows the `Article` class with all available preprocess hooks attached.

```turtle
@prefix code: <https://code.described.at/> .
@prefix knossos: <https://hypermedia.app/knossos#> .
@prefix hydra: <http://www.w3.org/ns/hydra/core#> .

<api/Article>
  a hydra:Class ;
  knossos:preprocessPayload
    [
      a code:EcmaScript ;
      code:link <file:lib/article#draftByDefault> ;
    ] ;
  knossos:preprocessResource
    [
      a code:EcmaScript ;
      code:link <file:lib/article#modifyResource> ;
    ] ;
  knossos:preprocessResponse
    [
      a code:EcmaScript ;
      code:link <file:lib/article#modifyResponse> ;
    ] ;
.
```

`knossos:preprocessPayload` and `knossos:preprocessResource` are implemented in knossos as [`resource` middleware](../knossos/configuration#middleware). Thus, both will run before the operation handler.

### preprocessPayload

Use `knossos:preprocessPayload` to modify the request body. This can be useful to set default values for optional properties or populate computed properties on resource creation.

```typescript
import type { ResourceHook } from '@hydrofoil/labyrinth/resource' 
import { schema } from '@tpluscode/rdf-ns-builders/strict'

export const draftByDefault: ResourceHook = (req, pointer) => {
  const hasStatus = pointer.out(schema.creativeWorkStatus).terms.length > 0
  if (!hasStatus) {
    pointer.addOut(schema.creativeWorkStatus, 'Draft')
  }
}
```

> [!WARNING]
> Be careful when using this hook with collections. Every `knossos:preprocessPayload` runs when
> [collection members are created](../knossos/collections.md#Creating-members) but also when a collection itself 
> [is created](../knossos/resources.md#creating-resources) using `PUT`. This means that appropriate guards may be necessary
> to separate the modifications done to collections and their respective members. 
> ```javascript
> function collectionHook(req, pointer) {
>   if (req.methods === 'PUT') { 
>     // creating a collection
>   }
>   if (req.method === 'POST') {
>     // creating a member
>   }
> }
> ```

### preprocessResource

Use `knossos:preprocessResource` to modify the representation of the current resource loaded by hydra-box.

> [!WARNING]
> This hook will not modify responses. It should be used to alter the behaviour of the operation handler itself if it performs conditional logic based on stored resource representation.

### preprocessResponse

Finally, `knossos:preprocessResponse` can be used to modify the final contents of the response just before sending it to the client. It is by called when executing the generic `GET` handlers `@hydrofoil/knossos/resource#get` and `@hydrofoil/knossos/collection#get`, and when creating collection members with `@hydrofoil/knossos/collection#CreateMember`.

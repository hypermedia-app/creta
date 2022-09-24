# Resource hooks

## Hook arguments

> [!TIP]
> All resource hooks functions below can be parametrised. Arguments are provided by attaching `code:arguments` to hook's node.
> See [here](./code-arguments.md) for more details.

## Before save hooks

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
    code:implementedBy [  
      a code:EcmaScript ;
      code:link <file:lib/article#cannotUnpublish> ;
    ] ;
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
      code:implementedBy
        [
          a code:EcmaScript ;
          code:link <file:lib/article#draftByDefault> ;
        ] ;
    ] ;
  knossos:preprocessResource
    [
      code:implementedBy
        [
          a code:EcmaScript ;
          code:link <file:lib/article#modifyResource> ;
        ] ;
    ] ;
  knossos:preprocessResponse
    [
      code:implementedBy
        [
          a code:EcmaScript ;
          code:link <file:lib/article#modifyResponse> ;
        ] ;
    ] ;
.
```

`knossos:preprocessPayload` and `knossos:preprocessResource` are implemented in knossos as [`resource` middleware](../knossos/configuration#middleware). Thus, both will run before the operation handler.

### preprocessPayload

Use `knossos:preprocessPayload` to modify the request body. This can be useful to set default values for optional properties or populate computed properties on resource creation.

```typescript
import type { ResourceHook } from '@hydrofoil/labyrinth/resource' 
import { schema } from '@tpluscode/rdf-ns-builders'

export const draftByDefault: ResourceHook = ({ req, pointer }) => {
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

## Before send hooks

> [!API]
> `import type { BeforeSend } from '@hydrofoil/labyrinth/middleware'`
>
> [Open API docs](/api/interfaces/_hydrofoil_labyrinth_lib_middleware_sendResponse.BeforeSend.html)

It is possible to modify the response at the final stage, right before the triples will be sent to the client. A before
send hook, declared on the class' Hydra operations receive the request and request objects, and the dataset itself. 

Below is an example of a hook which would set `cache-control` and `etag` headers on responses `GET` requests for articles.

```turtle
PREFIX code: <https://code.described.at/>
PREFIX hydra: <http://www.w3.org/ns/hydra/core#>
PREFIX knossos: <https://hypermedia.app/knossos#>

</api/Article>
    hydra:supportedOperation
    [
        hydra:method "GET" ;
        code:implementedBy
            [
                a code:EcmaScript ;
                code:link <node:@hydrofoil/labyrinth/resource#get> ;
            ] ;
        knossos:beforeSend
            [
                code:implementedBy
                    [
                        a code:EcmaScript ;
                        code:link <file:lib/cache.js#setHeaders> ;
                    ] ;
                code:arguments
                    [
                        code:name "cache-control" ; code:value "max-age=600" ;
                        code:name "etag" ; code:value true ;
                    ] ;
            ] ;
    ] ;
.
```

Here's a hypothetical implementation:

```typescript
import type { BeforeSend } from '@hydrofoil/labyrinth/middleware'
import toCanonical from 'rdf-dataset-ext/toCanonical.js'
import etag from 'etag'

type Headers = [{ etag?: boolean; 'cache-control'?: string }]

export const setHeaders: BeforeSend<Headers> = ({ res, dataset }, headers = {}) => {
    if (headers['cache-control']) {
        res.setHeader('cache-control', headers['cache-control'])
    }
    
    if (headers.etag) {
        res.setHeader('etag', etag(toCanonical(dataset)))
    }
}
```

> [!TIP]
> For an actual implementation, see the package `@hydrofoil/creta-labs`

> [!WARNING]
> Implementors should not modify the dataset. At the time of writing this is not forbidden but may change in a future release

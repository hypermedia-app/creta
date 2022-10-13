# Configuration

Most knossos configuration is sourced directly from the triples. A dedicated resource must be created. For example in `/resources/api/config.ttl`

```turtle
PREFIX hydra: <http://www.w3.org/ns/hydra/core#>
PREFIX knossos: <https://hypermedia.app/knossos#>

<>
  a knossos:Configuration ;
  hydra:ApiDocumentation </api> ;
.
```

## Middleware

> [!API]
> `import type { MiddlewareFactory } from '@hydrofoil/knossos/lib/settings'`
>
> [Open API docs](/api/interfaces/_hydrofoil_knossos_lib_settings.middlewarefactory.html)

Additional express request handlers can be linked to be loaded and hooked up on first request to the API. Add them to the configuration resource using a dedicated property.

```turtle
PREFIX knossos: <https://hypermedia.app/knossos#>
PREFIX schema: <http://schema.org/>
PREFIX code: <https://code.described.at/>

<> knossos:middleware
  [
    schema:name "{name}" ; 
    code:implementedBy
      [
        a code:EcmaScript ;
        code:link <file:path/to/module> ;
      ] ;
  ] .
```

The `schema:name` can be one of the following:

- `before` - runs before the hydra-box middleware. Use it for example to set up authentication or CORS middlewares
- `operations` - runs when operation candidates have been selected. It is the last chance to modify the operation which will be invoked
- `resource` - runs after the operation and resource have been selected and set to `req.hydra` and right before the operation middleware is invoked
- `error` - runs when an error is thrown in the request pipeline but before the error response is sent

The linked implementation must be a factory function which will return an express request handler or a promise.

Refer to [rdf-loader-code](https://github.com/zazuko/rdf-loader-code) package for details on using the `code:link` property.

> [!WARNING]
> There can be multiple middlewares under the same `schema:name` but their order will be unspecified. To ensure middlewares run in sequence, orchestrate them yourself with an express `Router`.

### Example

To add CORS to your API:

```typescript
// ./lib/cors.ts
import type { MiddlewareFactory } from '@hydrofoil/knossos/configuration'
import cors from 'cors'

export const middleware: MiddlewareFactory = (ctx) => {
    return cors({
        allowedHeaders: ['Link']
    })
}
```

And link as `code:link <file:lib/cors.js#middleware>`.

## Authorization rules

> [!API]
> `import { AuthorizationPatterns } from 'rdf-web-access-control'`
>
> [Open docs](https://github.com/hypermedia-app/web-access-control#custom-authorization-checks)

[Authorization](./auth.md) can be customized by providing additional SPARQL patterns to match against the ACL resources. 
They are declared as code links, which must export a function producing a partial SPARQL result.

```turtle
PREFIX knossos: <https://hypermedia.app/knossos#>
PREFIX code: <https://code.described.at/>

<>
  a knossos:Configuration ;
  knossos:authorizationRule [
    code:implementedBy [ 
      a code:EcmaScript ;
      code:link <file:path/to/module.js#customAuth> ;
    ] ;
  ] ;  
.
```

### Example: Authorizing groups

Here's an example implementation which would grant access to resources to members of `vcard:Group`.

```typescript
import { sparql } from '@tpluscode/sparql-builder'
import { acl, vcard } from '@tpluscode/rdf-ns-builders'

export const customAuth: AuthorizationPatterns = 
  ({
     authorization, // {RDF/JS variable} representing an ACL resoource
     agent,         // {RDF/JS Term} Authenticated agent's identifier
     agentClass     // {RDF/JS Term} Authenticated agent's class
  }) => {
    return sparql`${authorization} ${acl.agentGroup}/${vcard.hasMember} ${agent} .`
  }
```

> [!TIP]
> Support for `vcard:Group` is already provided by the [rdf-web-access-control](https://npm.im/rdf-web-access-control) package
> and can be imported as `code:link <node:rdf-web-access-control/checks#agentGroup>`. 

## Resource Loader

> [!API]
> `import type { ResourceLoaderFactory } from '@hydrofoil/knossos/lib/settings'`
>
> [Open API docs](/api/interfaces/_hydrofoil_knossos_lib_settings.resourceloaderfactory.html)

At the beginning of every request a [`ResourceLoader`](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/hydra-box/index.d.ts#L45-L48)
is called to determine the basic information about the addressed resource.
The default implementation is [`SparqlQueryLoader` provided by `@hydrofoil/labyrinth`](https://github.com/hypermedia-app/creta/blob/master/packages/labyrinth/lib/loader.ts#L23)

Use `knossos:resourceLoader` property in configuration resource to provide an alternative implementation.

```turtle
PREFIX knossos: <https://hypermedia.app/knossos#>
PREFIX code: <https://code.described.at/>

<>
  a knossos:Configuration ;
  knossos:resourceLoader [
    code:implementedBy [ 
      a code:EcmaScriptModule ;
      code:link <file:path/to/loader.js#factory> ;
    ] ;
  ] ;  
.
```

The `loader.js` module above might extend the default loader (which it needs to construct itself).

```ts
import type { ResourceLoaderFactory } from '@hydrofoil/knossos/lib/settings'
import { SparqlQueryLoader } from '@hydrofoil/labyrinth/lib/loader'
import SlidingExpiryCache from './cache.js'

export const factory: ResourceLoaderFactory = async (context) => {
  const inner = new SparqlQueryLoader(context.sparql)
  const classOperationCache = new SlidingExpiryCache()
  const propertyOperationCache = new SlidingExpiryCache()
    
  return {
    async forClassOperation(term, req) {
      if (!classOperationCache.has(term)) {
        classOperationCache.set(term, await inner.forClassOperation(term, req))
      }

      return classOperationCache.get(term)
    },
    async forPropertyOperation(term, req) {
      if (!propertyOperationCache.has(term)) {
        propertyOperationCache.set(term, await inner.propertyOperationCache(term, req))
      }

      return propertyOperationCache.get(term)
        
    }
  }
}
```

## Minimal representation loader

> [!API]
> `import type { MinimalRepresentationLoader } from '@hydrofoil/labyrinth/lib/middleware/returnMinimal'`
>
> [Open API docs](/api/interfaces/_hydrofoil_labyrinth_lib_middleware_returnMinimal.MinimalRepresentationLoader.html)

The default loader used to apply `Prefer: return=minimal` can be changed using knossos configuration resource. 

```turtle
PREFIX knossos: <https://hypermedia.app/knossos#>
PREFIX code: <https://code.described.at/>

<>
  a knossos:Configuration ;
  knossos:minimalRepresentationLoader [
    code:implementedBy [ 
      a code:EcmaScriptModule ;
      code:link <file:path/to/loader.js#returnMinimal> ;
    ] ;
  ] ;  
.
```

To implement, export an async function which will return an RDF/JS Stream. Here's an idea for using `CONSTRUCT` instead of `DESCRIBE`: 

```js
import { CONSTRUCT } from '@tpluscode/sparql-builder'

export function returnMinimal({ req, term }) {
  return CONSTRUCT`?s ?p ?o`
    .FROM(term)
    .WHERE`?s ?p ?o`
    .execute(req.labyrinth.sparql.query)
}
```

## Code overrides

Middleware which intend to expose extension points for their specific functionality may do so by looking for overrides
in the configuration resource. First, in the configuration graph add a `knossos:override` node. It must have a unique
identifier and a `code:implementedBy` object:

```turtle
PREFIX code: <https://code.described.at/>
PREFIX schema: <http://schema.org/>
PREFIX knossos: <https://hypermedia.app/knossos#>

<>
a knossos:Configuration ;
  knossos:override
    [
      schema:identifier <urn:override:extensionPoint> ;
      code:implementedBy
        [
          a code:EcmaScriptModule ;
          code:link <file:path/to/extensionPoint.js#default> ;
        ] ;
    ];
.
```

Then, add a `overrideLoader` middleware before the middleware which uses the extension point. It takes two parameter values:
`term`, which must match the `schema:identifier` and a `name`, which will be the key to set in `res.locals`.

```js
import $rdf from 'rdf-ext'
import { overrideLoader } from '@hydrofoil/knossos/configuration'

const extensionPoint = $rdf.namedNode('urn:override:extensionPoint')

const extensibleMiddleware = Router()
  .use(overrideLoader({ term: extensionPoint, name: 'foobar' }))
  .use((req, res, next) => {
    const extension = res.locals.foobar
    
    // rest of your handler
  })
```

## Accessing configuration

The configuration resource loaded by knossos gets attached as a `GraphPointer` to  a `req.knossos.config` property. 
It can be used throughout the express middlewares to, such as those defined as shown [above][#middleware].

```turtle
PREFIX schema: <http://schema.org/>
PREFIX my: <http://example.com/my#>
PREFIX knossos: <https://hypermedia.app/knossos#>

<> a knossos:Configuration ;
   my:setting [ schema:name "foo" ; schema:value "bar" ].
```

Use [clownface](http://zazuko.github.io/clownface/) to access the configuration graph:

```javascript
import { schema } from '@tpluscode/rdf-ns-builders'
import namespace from '@rdfjs/namespace'

const my = namespace('http://example.com/my#')

function middleware(req, res, next) {
  const mySetting = req.knossos.config.out(my.setting)
  const key = mySetting.out(schema.name).value
  const value = mySetting.out(schema.value).value
    
  if (key && value) {
    res.setHeader(`x-${key}`, value)
  }  
  next()
}
```

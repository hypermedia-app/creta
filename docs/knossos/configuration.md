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

# `@hydrofoil/creta-labs`

A package with experimental features which may become part of the core packages

## `redirect.js`

### `webPage`

A middleware which sends a redirect when the client requests HTML representation of a resource. For example, a web
application would serve representation of resource `/foo/bar` as `/app/foo/bar`. When a browser requests the former,
the server should redirect it to the latter.

Parameters:

| Parameter | Type | Required? | Default |
| -- |-- |-- | -- |
| `rewrite` | `(string, req) => string | null | undefined | Promise<string | null | undefined>` | yes | |
| `status` | 'number' | no | 303 |

Example configuration:

```turtle
PREFIX code: <https://code.described.at/>
PREFIX schema: <http://schema.org/>
PREFIX knossos: <https://hypermedia.app/knossos#>

<>
  knossos:middleware
    [
      schema:name "resource" ;
      code:implementedBy
        [
          a code:EcmaScript ;
          code:link <node:@hydrofoil/creta-labs/redirect.js#webPage> ;
        ] ;
      code:arguments
        [
          code:name "rewrite" ;
          code:value 
            [ 
              a code:EcmaScriptModule ; 
              code:implementedBy <file:lib/webPage.js#getPageForResource> ;
            ] ;
        ] ;
    ] .
```

Implementation:

```ts
// lib/webPage.js

export function getPageForResource(path: string): string {
  return `/app${path}`
}
```

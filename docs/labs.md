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

## `cache.js`

Exports function needed to set up [caching](https://webconcepts.info/specs/IETF/RFC/7234) 
and [conditional requests](https://webconcepts.info/specs/IETF/RFC/7232)

> [!TIP]
> For in-depth usage instructions see [advanced/caching](advanced/caching.md)

### `setHeaders`

A [`beforeSend` hook](./advanced/hooks.md#before-send-hooks) which sets `Cache-Control` and `eTag` headers. The latter is 
calculated from [canonical serialization](https://w3c-ccg.github.io/rdf-dataset-canonicalization/spec/) of the response dataset.

Parameters:

| Parameter | Type | Required? | Default |
| -- |-- |-- | -- |
| `cache-control` | `string` | no | |
| `etag` | 'number' | no | |

### `preconditions`

A middleware which executes precondition checks, such as `if-match`. Use is as a [`resource` middleware](knossos/configuration.md#middleware)

Parameters:

| Parameter | Type | Required? | Default |
| -- |-- |-- | -- |
| `stateAsync` | `(req) => { etag?: string; lastModified?: string }` | no | Fetches `HEAD` of current `req.hydra.term` |
| `requiredWith` | 'string[]' | no | `['PUT', 'PATCH', 'DELETE']` |

Implementation of `stateAsync` must return the etag and/ore last modified date of the checked resource in their respective
lexical form as defined by the specifications.
`requiredWith` denotes which request methods will require the precondition headers.


## `describeStrategy.js`

### `constructByNodeShape`

Implements the [`DescribeStrategyFactory`](knossos/resources.md#resource-describe-strategy) so that resources are loaded
using a `CONSTRUCT` built from a `NodeShape`. By default, will expect `dash:shape` set to the resource but the predicate
can be changed, as would be a good idea in the case of collections.

Parameters:

| Parameter | Type | Required? | Default |
| -- |-- |-- | -- |
| `shapePath` | 'NamedNode' | no | `hyper_query:constructShape` |

When multiple shapes are found, they are combined in a `UNION`. 

Here's an example of how an `Article` and `ArticleCollection` classes would be configured to construct a specific shape 
for the instances and collection members respectively.

[filename](labs/constructExample.trig ':include :type=code turtle')

> [!NOTE]
> The query will always include patterns for resources' `rdf:type` types

## HTTP cache

> [!WARNING]
> Consider this feature incomplete and potentially unstable. Any details are prone to change in future releases.

Efficiently and accurately using HTTP cache is imperative for the success of real-time web applications, That includes APIs,
and even more so when backed by triple stores whose flexibility often come with a performance penalty.

Creta provides the necessary building blocks to set up web cache but makes certain assumptions of how it can be done.

### Selecting resources to cache

The decision what caching headers to add to a response is made by the Hydra operation associated with the request. Not the
resource type, because any resource can support multiple operations and multiple HTTP methods, each requiring different
cache strategy.

### Default cache for all resources

The default Hydra operation supported by all resources could be extended with a `beforeSend` hook. In the example below,
the server will add a `cache-control` to every response message.

```turtle
prefix code: <https://code.described.at/>
prefix hydra: <http://www.w3.org/ns/hydra/core#>
prefix knossos: <https://hypermedia.app/knossos#>

<>
    knossos:supportedBy hydra:Resource ;
    hydra:method "GET" ;
    code:implementedBy
        [
            a code:EcmaScript ;
            code:link <node:@hydrofoil/labyrinth/resource#get> ;
        ] ;
# add this
    knossos:beforeSend
        [
            code:implementedBy
                [
                    a code:EcmaScript ;
                    code:link <node:@hydrofoil/creta-labs/cache#setHeaders> ;
                ] ;
            code:arguments
                [
                    code:name "cache-control" ;
                    code:value "max-age=3600, stale-when-revalidate=120" ;
                ] ;
        ] ;
.
```

### ETags

To make cache invalidation and other [conditional requests](#conditional-requests) possible, the `setHeaders` before send
hook supports an `etag` parameter. When set to `true`, a hash of the RDF response dataset will be calculated. To ensure
consistency, the dataset will first be serialized to a [canonical form](https://w3c-ccg.github.io/rdf-dataset-canonicalization/spec/),
and then hashed.

For example, to enable etags for an Article class

```turtle
prefix code: <https://code.described.at/>
prefix hydra: <http://www.w3.org/ns/hydra/core#>
prefix knossos: <https://hypermedia.app/knossos#>

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
                            code:link <node:@hydrofoil/creta-labs/cache#setHeaders> ;
                        ] ;
                    code:arguments
                        [
                            code:name "cache-control" ;
                            code:value "max-age=3600, stale-when-revalidate=120" ;
                        ] ,
                        [
                            code:name "etag" ;
                            code:value true ;
                        ] ;
                ] ;
        ] ; 
.
```

> [!NOTE]
> There is no "inheritance" of cache settings. Thus, the hook must explicitly repeat the `cache-control` every time, even
> if there is a cache enabled on the [default operation handler](#default-cache-for-all-resources).

#### Strong vs weak ETags

By default, all generated ETags are "weak", which means that they can be used for caching but not for conditional requests.
That is because a "full" representation of a resource is queried from the [union graph](https://patterns.dataincubator.org/book/union-graph.html)
so that they can include triples asserted outside the resource's own named graph. The full representation may also include
inferred triples, depending on the SPARQL endpoint configuration.

Strong ETags are only generated for requests negotiating for [minimal representation](https://www.rfc-editor.org/rfc/rfc7240#section-4.2).
This way ensures that no side effects of other resource changes will affect the ETag, as it must be guaranteed to be
equal when the resource itself is unchanged.

```http request
GET /resource
Prefer: return=minimal
```

> [!TIP]
> Refer to the documentation of [minimal representation loader](../knossos/configuration.md#minimal-representation-loader)
> to see how to set up your own implementation of how the minimal representation is constructed.

### Conditional requests

To take full advantage of ETags, the API must also perform [precondition checks](https://developer.mozilla.org/en-US/docs/Web/HTTP/Conditional_requests).
They can be used by the clients to determine if cache is fresh (server returns `304` status to `GET`), or avoid the lost
update problem (server rejects update requests when resource has changed since the client had last retrieved it).

To set up, add the preconditions middleware at the `before` extension point. 

```turtle
PREFIX schema: <http://schema.org/>
prefix code: <https://code.described.at/>
prefix knossos: <https://hypermedia.app/knossos#>

<>
    a knossos:Configuration ;
    knossos:middleware
        [
            schema:name "before" ;
            code:implementedBy
                [
                    a code:EcmaScript ;
                    code:link <node:@hydrofoil/creta-labs/cache#preconditions> ;
                ] ;
        ] ;
.
```

> [!NOTE]
> By default, precondition headers are required on requests with methods `PUT`, `PATCH` and `DELETE`.

# Multi-tenancy

It is possible to serve multiple APIs using a single knossos process by binding it to multiple host domains.

Knossos determines requested resource identifiers by checking the `Host` http header. Every unique host will initialize a new `ApiDocumentation` resource.

> [!TIP]
> Every API will need its respective resources being created in the store.
> You can even host multiple instances of same API by using [talos](../talos.md) to initialize multiple domain using same set of resources
>
> ```
> talos put ./resources --api https://conduit.lndo.site/
> talos put ./resources --api https://test.conduit.lndo.site/
> ```

> [!WARNING]
> Remember that relative `file:` paths used with `code:link` inside resources may not resolve correctly when serving multiple unrelated APIs. To avoid that, make sure to publish all code as NPM modules and instead link the using `node:` URIs.

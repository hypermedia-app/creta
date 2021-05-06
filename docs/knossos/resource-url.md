# Resource URLs

Knossos does not require any configuration of the base resource URLs. A combination of express middleware packages will derive from the runtime what is the correct identifier of the requested resources. Most notably, when hosted behind a proxy, the proxy headers plus express routing configuration will determine the base URL.

## Creating identifiers

Inside any handler middleware, `req.rdf` can be used to create RDF/JS nodes. It is a standard [data factory](https://rdf.js.org/data-model-spec/#datafactory-interface), only differing in the implementation of `namedNode` that it always returns absolute URLs based in the correct API namespace.

You can read about it on it's [package page](https://npm.im/rdf-express-node-factory).

## Overriding

In a case when the hosting does match the resource identifiers, such as when running a dev environment on `localhost` but wishing to use "real" URLs in the database, it is possible to override base URL.

```bash
yarn knossos --resource-url https://hypermedia.app/project/
```

By passing the CLI option, all identifiers will use that value as the namespace.

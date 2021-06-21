# Designing APIs

In principle, a Knossos-powered API adheres to the [Hydra Core vocabulary][hydra] and can be used by any conforming client. However, there are some specific requirements which need to be met for the API to behave as expected.

## API provenance

> [!NOTE]
> Running `talos put --resources` inject the `hydra:apiDocumentation` link automatically. Thus, it is usually not necessary to explicitly add it to the resources when using `talos` to bootsrtap the database.

In order for the resources to correctly "appear" on the APIs surface, it may be necessary to explicitly annotate them as being part of it. This is done by adding a `hydra:apiDocumentation` to resources and strictly required in some cases:

```turtle
PREFIX acl: <http://www.w3.org/ns/auth/acl#>
prefix events: <https://hypermedia.app/events#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX hydra: <http://www.w3.org/ns/hydra/core#>

# Shapes
</PersonShape> 
    a sh:NodeShape ;
    sh:targetClass schema:Person ;
    hydra:apiDocumentation </api> 
.

# Supported classes
</PersonCollection>
    a hydra:Class ;
    rdfs:subClassOf hydra:Collection ;
    hydra:apiDocumentation </api> ;
.

# Supported operations
</PutPerson>
    a hydra:Operation ;
    hydra:apiDocumentation </api> ;
.

# Knossos event handlers
</on-person-created>
    a events:EventHandler ;
    hydra:apiDocumentation </api> ;
.

# ACL authorizations
</on-person-created>
    a acl:Authorization ;
    hydra:apiDocumentation </api> ;
.
```

> [!NOTE]
> While not yet fully implemented, this feature will enable running multiple APIs for a single database (multi-tenancy). The `hydra:apiDocumentation` property will prevent resources from "leaking" between tenants.

Collections by default do not impose that restriction. To create collection which only returns object for the given API in a multi-tenant scenario, add a `hydra:memberAssertion` as outlined in the [Static filters](knossos/collections.md#static-filters) section.

```turtle
PREFIX hydra: <http://www.w3.org/ns/hydra/core#>

</people>
  a hydra:Collection ;
  hydra:memberAssertion
  [
    hydra:property hydra:apiDocumentation ;
    hydra:object </api> ;
  ] ;
.
```

It will also ensure that new members created with POST will automatically have that property attached .

> [!ATTENTION]
> When creating and querying resources yourself, remember to include the `?resource hydra:apiDocumentation ?api` pattern when necessary, to avoid unexpected results.

[hydra]: https://www.hydra-cg.com/spec/latest/core/

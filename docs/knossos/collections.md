# Collections

Collections are a special kind of resource, which act as containers for other resources sharing certain properties. The base class for collections if `hydra:Collection`.

Knossos provides all necessary modules for working with collections and their members (elements).

## Creating a collection

An instance of `hydra:Collection` needs to be first [created as any other resource](knossos/resources.md#creating-resources). By default, however, the base class would not be used directly. The `knossos init` commend generates a type `/api/Collection` which should be used a base class for more specific collection types.

Unless customized, instances of `/api/Collection` will respond to `GET` requests, supporting paging and filtering, and require at least one [member assertion](http://www.hydra-cg.com/spec/latest/core/#member-assertions).

### Read-only collection of articles

While not strictly necessary, it is a good practice to extends the base collection class and add SHACL constraints on the member assertion, to ensure that collection instances' integrity.

```turtle
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix hydra: <http://www.w3.org/ns/hydra/core#>
prefix sh: <http://www.w3.org/ns/shacl#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>

</api/ArticleCollection>
  rdfs:subClassOf hydra:Collection ;
  sh:property 
  [
    sh:path hydra:memberAssertion ;
    sh:minCount 1 ;
    sh:node
      [
        sh:property
          [
            sh:path hydra:property ;
            sh:hasValue rdf:type ;
            sh:minCount 1 ;
            sh:nodeKind sh:IRI ;
          ],
          [
            sh:path hydra:object ;
            sh:hasValue </api/Article> ;
            sh:minCount 1 ;
            sh:nodeKind sh:IRI ;
          ]
      ]
  ] ;
.
```

> [!WARNING]
> The restriction on `hydra:memberAssertion` as above requires that there is at least one like
>
> ```turtle
  prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  prefix hydra: <http://www.w3.org/ns/hydra/core#>
>
>   [
    hydra:property rdf:type ;
    hydra:object </api/Article> ;
  ] .
> ```
> This ensures that [dereferencing](#dereferencing) the collection and creating new members will be restricted to member resources of the correct type.

The simplest, valid instance of the article collection would look like:

```turtle
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix hydra: <http://www.w3.org/ns/hydra/core#>

</articles>
  a </api/ArticleCollection> ;
  hydra:memberAssertion
  [
    hydra:property rdf:type ;
    hydra:object </api/Article> ;
  ] ;
.
```

## Collections with static members

Alternatively, a simplest possible collection directly links to its members using `hydra:member` predicate.

Such a collection does not require `hydra:memberAssertion` as it will always return the same representation. It also does not support filtering.

## Reading collections

By default, any instance of `/api/Collection` will respond to `GET` requests, handled by the module [@hydrofoil/labyrinth/collection](https://github.com/hypermedia-app/creta/blob/master/packages/labyrinth/collection.ts).

Without additional annotations, the `/articles` collection above will contain members which match a SPARQL pattern constructed from the member assertion (excerpt).

```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?member {
  ?member rdf:type </api/Article>
}
```

A representation of `/articles` would be similar to

```turtle
prefix hydra: <http://www.w3.org/ns/hydra/core#>

</articles>
  a </api/ArticleCollection> ;
  hydra:member </article/rdf-101>, </article/advanced-sparql> ;
.
```

## Eager-loading linked resources

To transclude resources linked to collection members, use the `hyper-query:include` predicate. Its objects must be nodes with the `hyper-query:path` property whose value is a well-formed [SHACL Property Path](https://www.w3.org/TR/shacl/#property-shapes).

> [!TIP]
> `hyper-query:include` can be used both on instances, as well as collection classes. The latter apply to all instances and get combined with direct inclusion paths.

The example below shows how to extend all article collections to include authors

```turtle
PREFIX schema: <http://schema.org/>
PREFIX hyper-query: <https://hypermedia.app/query#>

</api/ArticleCollection>
    hyper-query:include 
    [
        hyper-query:path schema:author ;
    ] ;
.
```

## Static filters

By adding more objects to the `hydra:memberAssertion` property, the collection can be statically narrowed down to a subset of members.

For example, the collection might be made more specific, to only include articles which have a `schema:Published` status.

```turtle
prefix schema: <http://schema.org/>
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix hydra: <http://www.w3.org/ns/hydra/core#>

</articles>
  hydra:memberAssertion
  [
    hydra:property schema:creativeWorkStatus ;
    hydra:object "Published" ;
  ] ;
.
```

The member assertion must have exactly two of the properties `hydra:subject`, `hydra:property` and `hydra:object`. Thus, it can be used to express any graph pattern, where the missing term will be substituted by the member itself. Given that, it would be possible to reverse the assertion to create another collection, such as a user's starred articles:

```turtle
prefix schema: <http://schema.org/>
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix hydra: <http://www.w3.org/ns/hydra/core#>

</user/john/starred-articles>
  hydra:memberAssertion
  [
    hydra:property rdf:type ;
    hydra:object </api/Article> ;
  ] , [
    hydra:subject </user/john> ;
    hydra:property </api/starred> ;
  ] ;
.
```

The above would translate to a query similar to

```sparql
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?article {
  ?article rdf:type </api/Article> .
  </user/john> </api/starred> ?article .
}
```

Finally, the static filter can be narrowed down only to the member's own graph:

```diff
+prefix knossos: <https://hypermedia.app/knossos#>

</user/john/starred-articles>
  hydra:memberAssertion
  [
    hydra:property rdf:type ;
    hydra:object </api/Article> ;
+   knossos:ownGraphOnly true ; 
  ] ;
.
```

This will wrap such a member assertion in a `GRAPH ?member` pattern

> [!TIP
> This technique is useful to exclude inferred terms from matching the query. Only the resources self-asserted properties will be matched.

## Queries

Collections can also be queries dynamically using `GET` requests with query strings. The variables passed by the client need to be mapped to URI Template variables which gets reconstructed into an RDF graph of filters on the server. The filters are then transformed into SPARQL query patterns using JS code.

For an instance of `/api/ArticleCollection` to support filtering by article title, first create an instance of a `hydra:IriTemplate` which will define the available filters, and the URL Template to build a request.

```turtle
prefix code: <https://code.described.at/>
prefix schema: <http://schema.org/>
prefix hydra: <http://www.w3.org/ns/hydra/core#>
prefix query: <https://hypermedia.app/query#>

</api/template/article-collection-search>
  a hydra:IriTemplate ;
  hydra:template "{?title}" ;
  hydra:resolveRelativeTo hydra:LinkContext ;
  hydra:mapping 
  [
    hydra:variable "title" ;
    hydra:property schema:title ;
    query:filter
    [
      a code:EcmaScriptModule ;
      code:link <file:filters/articles/title.js#startsWith> ;
    ] ;
  ] ;
.
```

Then, add a `hydra:search` link to a queryable instance. This will instruct the client what are the supported query filters.

```turtle
prefix hydra: <http://www.w3.org/ns/hydra/core#>

</articles>
  hydra:search </api/template/article-collection-search> ;
.
```

Finally, implement the `query:filter` code link, which will be loaded when the mapped query params is set. It must be a module exporting a function which returns a string, or a `SparqlTemplateResult`, as shown in the example below.

```js
import { sparql } from '@tpluscode/rdf-string'

/**
* Create a graph pattern to get article title and
* filter where the title starts with the provided value
*/
export function startsWith({ subject, predicate, object }) { 
  return sparql`
  ${subject} ${predicate} ?title .

  FILTER ( REGEX (?title, "^${object.value}", "i") )`
}
```

> [!TIP]
> Consult the package [rdf-loader-code](https://npm.im/rdf-loader-code) for more details about loading modules using RDF declarations.

## Paging

To split a large collection into multiple pages, it is required to add to a [search template](#queries) a variable mapped to the property `hydra:pageIndex`.

```turtle
PREFIX api: <https://example.com/api#>
PREFIX hydra: <http://www.w3.org/ns/hydra/core#>

</articles>
  a api:ArticleCollection ;
  hydra:limit 20 ;
  hydra:search [
    hydra:template "{?page}" ;
    hydra:mapping 
      [
        hydra:variable "page" ;
        hydra:property hydra:pageIndex ;
      ] ;
    ]
.
```

This will allow clients to navigate the collection 20 items at a time.

> [!TIP]
> The default page size equal `10`. Additionally, it can be set on the collection type, to set the default page size for all its instances
>
> ```turtle
PREFIX api: <https://example.com/api#>
PREFIX hydra: <http://www.w3.org/ns/hydra/core#>
>
> api:ArticleCollection hydra:limit 15 .
> ```

Each page of such a collection will return `hydra:PartialCollectionView` with links to other pages for the client to follow:

```turtle
PREFIX hydra: <http://www.w3.org/ns/hydra/core#>

</users?page=10>
  hydra:view
    [
      hydra:first </users?page=1> ;
      hydra:previous </users?page=9> ;
      hydra:next </users?page=11> ;
      hydra:last </users?page=99> ;
    ] ;
.
```

Finally, `hydra:limit` can also appear as a search template variable, allowing clients to request pages of arbitrary size.

The collection below will default to 20 items per page, overridable by setting a query string such as `pageSize=10`.

```turtle
PREFIX api: <https://example.com/api#>
PREFIX hydra: <http://www.w3.org/ns/hydra/core#>

</articles>
  a api:ArticleCollection ;
  hydra:limit 20 ;
  hydra:search [
    hydra:template "{?page,pageSize}" ;
    hydra:mapping 
      [
        hydra:variable "page" ;
        hydra:property hydra:pageIndex ;
      ],
      [
        hydra:variable "pageSize" ;
        hydra:property hydra:limit ;
      ];
    ]
.
```

## Ordering

A [paged](#paging) collection can be further configured to apply specific order to the returned members. Similarly to paging, both the collection type, as well as the instances can be annotated with information for the server to apply ordering

```turtle
PREFIX ldp: <http://www.w3.org/ns/ldp#>
PREFIX schema: <http://schema.org/>
PREFIX api: <https://example.com/api#>
prefix hydra: <http://www.w3.org/ns/hydra/core#>
prefix query: <https://hypermedia.app/query#>

# an instance sorted by titles and then by dates, descending
</articles>
  a api:ArticleCollection ;
  query:order (
    [ query:path schema:title ]
    [ query:path schema:dateCreated ; query:direction ldp:Descending ]
  ) ;
.

# other instances will be ordered only by title
api:ArticleCollection
  query:order (
    [ query:path schema:title ]
  ) ;
.
```

The object of `query:order` must be a list.

Allowed objects of `query:path` are any valid [SHACL Property Paths][spp], with the exception of `sh:zeroOrMorePath` and `sh:oneOrMorePath`.

[spp]: https://www.w3.org/TR/shacl/#property-shapes

The only recognized value for `query:direction` is `ldp:Descending`. Any other value will be ignored.

## Creating members

A collection can be used to create new instances of its type, typically by sending `POST` requests. This is a common way which has the server assign identifiers of the newly created resources, as described by the [POST-PUT Creation pattern](http://restalk-patterns.org/post-put.html).

To enable this feature, the collection class has to support the `POST` operation, implemented by a generic `knossos` handler. It also has to be annotated with an IRI Template for the new instance identifiers.

Member assertions which have `hydra:predicate` and `hydra:object` will be implicitly added to the newly created resource. Other member assertions will be ignored.

```turtle
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix schema: <http://schema.org/>
prefix acl: <http://www.w3.org/ns/auth/acl#> 
prefix hydra: <http://www.w3.org/ns/hydra/core#> 
prefix knossos: <https://hypermedia.app/knossos#> 
prefix auth: <https://hypermedia.app/auth#> 
prefix code: <https://code.described.at/>

</api/WritableArticleCollection>
  rdfs:subClassOf </api/ArticleCollection> ;
  hydra:supportedOperation
    [
      a schema:CreateAction ;
      auth:access acl:Create ;
      hydra:method "POST" ;
      hydra:title "New Article" ;
      hydra:expects </api/Article> ;
      code:implementedBy
        [
          a code:EcmaScript ;
          code:link <node:@hydrofoil/knossos/collection#CreateMember> ;
        ] ;
    ] ;
  knossos:memberTemplate
    [
      a hydra:IriTemplate ;
      hydra:template "/article/{title}" ;
      hydra:mapping
        [
          hydra:variable "title" ;
          hydra:property schema:title ;
          hydra:require true ;
        ] ;
    ] ;
.
```

> [!WARNING]
> The type `schema:CreateAction` is necessary for the operation to create a new resource

> [!TIP]
> The snippet above proposes to subclass the article collection so that API providers have fine-grained control of which collections can be used to create new resources and which cannot.

### Transforming variables

The above snippet could return long identifiers, riddled with percent-encoded characters which otherwise would not be allowed in URIs.

Another pitfall could be clashing identifiers, given the same values of the mapped predicates.

For that purpose, knossos allows adding a transformation function to each mapping, so that objects can be modified before they are passed to the template for expansion.

```turtle
prefix code: <https://code.described.at/>
prefix schema: <http://schema.org/>
prefix hydra: <http://www.w3.org/ns/hydra/core#>
prefix knossos: <https://hypermedia.app/knossos#> 

</api/WritableArticleCollection>
  knossos:memberTemplate
    [
      a hydra:IriTemplate ;
      hydra:template "/article/{title}" ;
      hydra:mapping
        [
          hydra:variable "title" ;
          hydra:property schema:title ;
          hydra:require true ;
          knossos:transformVariable
            [
                a code:EcmaScript ;
                code:link <file:lib/article#slugifyTitle> ;
            ] ;
        ] ;
    ] ;
.
```

The hypothetical implementation of `lib/article` could cut the title and add a random string at the end to create shorter, random URIs

```typescript
import type { TransformVariable } from '@hydrofoil/knossos/collection'
import $rdf from 'rdf-ext'
import URLSlugify from 'url-slugify'

const slugify = new URLSlugify() 

export const slugifyTitle: TransformVariable = (term) => {
    const title = term.value
    
    return $rdf.literal(slugify(title.substr(0, 10)))
}
```

### Static member assertions

The handler `@hydrofoil/knossos/collection#CreateMember` builds an identifier from the request payload as described by the `hydra:mapping`. It will also ensure that the new instance has all the member assertions.

```turtle
prefix schema: <http://schema.org/>
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix hydra: <http://www.w3.org/ns/hydra/core#>

</articles/new>
  a </api/WritableArticleCollection> ;
  hydra:memberAssertion 
  [
    hydra:property rdf:type ;
    hydra:object </api/Article> ;
  ] ,
  [
    hydra:property schema:creativeWorkStatus ;
    hydra:object "Draft" ;
  ] ;
.
```

Given a `POST` request to the `</articles/new>`, the API will explicitly add the `<> rdf:type </api/Article>` and `<> schema:creativeWorkStatus "Draft"` statements about the newly created resource.

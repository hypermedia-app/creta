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
  rdfs:subClassOf </api/Collection> ;
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
      a code:EcmaScript ;
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

Finally, implement the `query:filter` code link, which will be loaded when the mapped query params is set. It must a CommonJS module exporting a function which returns a string, or a `SparqlTemplateResult`, as shown in the example below.

```js
const { sparql } = require('@tpluscode/rdf-string')

/**
* Create a graph pattern to get article title and
* filter where the title starts with the provided value
*/
function startsWith({ subject, predicate, object }) { 
  return sparql`
  ${subject} ${predicate} ?title .

  FILTER ( REGEX (?title, "^${object.value}", "i") )`
}

module.exports = {
  startsWith
}
```

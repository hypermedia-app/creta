# Resources

Knossos can use any SPARQL-enabled database for persisting its resources. In fact, everything is a resource: the user data, API description, data models, access control (users, groups, permissions), definition of event handlers. Below is a fairly complete subset of resources, which would constitute a minimal articles API, complete with resource validation and access control.

## Complete example

```trig
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix dash: <http://datashapes.org/dash#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix code: <https://code.described.at/> .
@prefix acl: <http://www.w3.org/ns/auth/acl#> .
@prefix schema: <http://schema.org/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix hydra: <http://www.w3.org/ns/hydra/core#> .
@prefix auth: <https://hypermedia.app/auth#> .
@prefix knossos: <https://hypermedia.app/knossos#> .

# The API Documentation itself will be served by the API
# together with other vital resources, mainly hydra:Classes.
#
# It also provides link to the API's entrypoint ("home") resource
graph <api> {
  <api> a hydra:ApiDocumentation ;
        hydra:entrypoint <>
}

# The entrypoint is just a place where clients would start
# interacting with the API. By providing a link to the <articles>
# collection they will be able to retrieve and create articles 
graph <> {
  <> a hydra:Resource ;
     hydra:collection <articles> ;
}

# An article class is the core domain model of the API.
# It is also a Node Shape, which is required for creating instances with the API. The shape will be used for validating the request payload
#
# Below definition requires two fields: schema:name and schema:articleBody
graph <api/Article> {
  <api/Article> a hydra:Class, rdfs:Class, sh:NodeShape ;
    rdfs:subClassOf schema:Article ;
    knossos:createWithPUT true ;
    sh:property [
      sh:name "Title" ;
      sh:path schema:name ;
      sh:minCount 1 ;
      sh:maxCount 1 ;
      sh:order 10 ;
    ] , [
      sh:name "Body" ;
      sh:path schema:articleBody ;
      sh:minCount 1 ;
      sh:maxCount 1 ; 
      dash:singleLine false ;
      sh:order 20 ;
    ]
}

# A collection type is needed to annotate a possible request to create
# a new Article
graph <api/ArticleCollection> {
  <api/ArticleCollection> a hydra:Class ; 
    rdfs:subClassOf hydra:Collection ;
    hydra:supportedOperation
      [
        auth:access acl:Create ;
        hydra:method "POST" ;
        hydra:title "Create article" ;
        code:implementedBy
          [
            a code:EcmaScript ;
            code:link <node:@hydrofoil/knossos/collection#POSTCreate> ;
          ] ;
      ] ;
}

# Last resource is an instance of the articles collection, which will be
# the target for a POST request to create
graph <articles> {
  <articles> a <api/ArticleCollection> ;
    hydra:manages [
      hydra:property rdf:type ;
      hydra:object <api/Article>
    ] ;
}

# This ACL will grant any authenticated user the
# permission to actually create instances of articles
#
# See how it matches the `acl:Create` of the POST operation on the 
# article collection and the <api/Article> class which would be created. 
graph <api/auth/authenticated-user-create-article> {
  <api/auth/authenticated-user-create-article>
    a acl:Authorization ;
    acl:accessToClass <api/Article> ;
    acl:mode acl:Create ;
    acl:agentClass acl:AuthenticatedAgent ;
}

# Finally, by using foaf:Agent as the authorized class,
# any instance of Article and the collection will be accessible
# by anonymous users
graph <api/auth/anyone-read-articles> {
  <api/auth/authenticated-user-create-article>
    a acl:Authorization ;
    acl:accessToClass <api/Article> ;
    acl:accessTo <articles> ;
    acl:mode acl:Read ;
    acl:agentClass foaf:Agent ;
}
```

> [!TIP]
> As seen above, by default, every resource is stored in its own named graph, using its own identifier as the graph's name. At the time of writing it is the only resource persistence pattern supported by knossos.

## Creating resources

New resources are created with a `PUT` HTTP request with an RDF body. The request target is assumed to be the base URI for the parser and thus an empty named node can be used to refer to the creates resource.

```http request
PUT /article/intro-to-rdf HTTP/2
Authorization: Bearer token
Content-Type: text/turtle

prefix schema: <http://schema.org/>

<> a </api/Article> ;
  schema:name "Introduction to RDF" ;
  schema:articleBody " ... " ;
.
```

For such a request to succeed, a number of conditions must be met:

- there needs to exist a `sh:NodeShape` describing the class `</api/Article>` (see [Validation](#validation) section below)
- at least on type of the created resource needs to be annotated with `knossos:createWithPUT true`
- none of the types can have `knossos:createWithPUT false`
- an `acl:Authorization` needs to exist, granting `acl:Control` or `acl:Create` mode to any of the resource types

> [!NOTE]
> This assumes that the resource does not already exist. Same resource would be used to [update](#updating-resources), but would require slightly different setup

The exact same method would be used to create any kind of resource, be it "user resources", such as the article above, as well as instances of classes, `acl:Authorization`, etc. This way, a uniform interface is used to control all aspects of an API.

## Updating resources

A `PUT` verb can also be used to update (replace) an existing resource. To allow updates, any of an existing resource's types must be supported class and support the `PUT` method. Knossos provides a generic update handler implementation.

For example, to make the `/api/Article` class updatable with `PUT`, it would have be extended with at minimum the triples below.

```turtle
prefix code: <https://code.described.at/>
prefix hydra: <http://www.w3.org/ns/hydra/core#>

<api/Article>
  hydra:supportedOperation [
    hydra:method "PUT" ;
    code:implementedBy [
      a code:EcmaScript ;
      code:link <node:@hydrofoil/knossos/resource#PUT>
    ] ;
  ] ;
.
```

This will have the API load a handler from the module `@hydrofoil/knossos/resource`. Similarly to creating resources, that handler will require appropriate `acl:Authorization` and perform validation of resource's SHACL shapes.

## Validation

Knossos uses SHACL via [express-middleware-shacl](https://npm.im/express-middleware-shacl) to validate resources when handling requests with RDF bodies.

To validate a resource, knossos will load from the store all Node Shapes, which target the exact resource or its types. Shown below is a request to update a resource, its current state, and the shapes which would be loaded from the store.

### Example update request

```http request
PUT /user/john
Content-Type: text/turtle

<> a </api/Person> ; schema:name "John Doe" .
```

### Loaded shapes

Currently, knossos loads shapes using implicit class target, explicit class target, and node target.

```turtle
@prefix schema: <http://schema.org/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

# implicitly targeted shape
</api/Person>
  a rdf:Class, sh:NodeShape ;
  rdfs:subClassOf schema:Person ;
.

# explicitly targeted shape
</shape/schema:Person>
  a sh:NodeShape ;
  sh:targetClass schema:Person ;
.

# node target
</shape/user/john>
  a sh:NodeShape ;
  sh:targetNode </user/john> ;
.
```

### Using the module

To protect custom resource handlers, precede your middleware with the shacl module.

```typescript
import { Router } from 'express'
import { shaclValidate } from '@hydrofoil/knossos/shacl'

export const middleware = Router()
    .use(shaclValidate)
    .use((req, res) => {
        res.send('Request valid')
    })
```

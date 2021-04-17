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
            code:link <node:@hydrofoil/knossos/collection#POST> ;
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

# @hydrofoil/knossos

Knossos is a high level Hydra server, which allows rapidly deploying Hydra-powered APIs backed by a triplestore.

### Low friction

No initial setup, you only need to create an RDF database with SPARQL Query/Update functionality.

### Turtles all the way down

The entire API is stored as RDF graph:

- The proper API resources 
- Hydra API Documentation
- The data models, using SHACL Shapes

### Eating its own dog food

The API itself is also controlled using HTTP interface:

- Creating data models
- Exposing functionality as Hydra Supported Operations
- Fine-grained access control
  
## TODOs

- Control the implicit `PUT` on per-class basis

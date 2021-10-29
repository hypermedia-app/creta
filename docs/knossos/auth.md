# Security

## Authentication

To set up an authentication middleware, add it to the [configuration](./configuration.md) resource with the `before` key.

```turtle
PREFIX code: <https://code.described.at/>
PREFIX schema: <http://schema.org/>
PREFIX hydra: <http://www.w3.org/ns/hydra/core#>
PREFIX knossos: <https://hypermedia.app/knossos#>

<>
  a knossos:Configuration ;
  hydra:ApiDocumentation </api> ;
  knossos:middleware
    [
      schema:name "before" ;
      code:implementedBy
        [
          a code:EcmaScript ;
          code:link <file:path/to/authenticate#default> ;
        ] ;
    ] ;
.
```

The value must be a module path, relative to the `codePath` directory passed to the `knossos serve` command.

> [!TIP]
> It is also possible to provide load from `node_modules`. See [rdf-loader-code](https://github.com/zazuko/rdf-loader-code) package for more examples.

The module must have a default export of a function which returns an express `RequestHandler` or such a promise.

Upon successful authentication, the handler should set `req.agent` from a Graph Pointer, such as created by [clownface](https://zazuko.github.io/clownface).

### Example

To integrate [basic authentication](https://npm.im/basic-auth)

```typescript
import type { MiddlewareFactory } from '@hydrofoil/knossos/configuration'
import auth from 'basic-auth'
import compare from 'tsscmp' 
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import { foaf, rdf } from '@tpluscode/rdf-ns-builders'

const authentication: MiddlewareFactory = () => {
  return (req, res, next) => {
    const { name, pass } = auth(req)
    
    if (compare(name, 'john') && compare(pass, 'super-secret')) {
      req.agent = clownface({ dataset: $rdf.dataset() })
        .namedNode($rdf.namedNode(`http://example.com/user/${name}`))
        .addOut(rdf.type, foaf.Person)
    }
  
    next()
  }
}

export default authentication
```

## Authorization

To authorize requests, `knossos` uses [Web Access Control](https://www.w3.org/wiki/WebAccessControl) spec via the package [hydra-box-web-access-control](https://npm.im/hydra-box-web-access-control).

During request, the `req.agent`, if given, is combined with the identifier and RDF types of the requested resource to query the database for instances of `acl:Authorization`, which grant access.

If there is no authenticated agent, `knossos` will query for authorization resources with `[] acl:agentClass foaf:Agent`, which is the Web Access Control way for granting anonymous access.

### Custom authorization rules

It is possible to add additional pattern to be executed against the database to customize how agents are authorized. This is done by adding to the [settings resource](configuration.md) links to code which import function passed on to [rdf-web-access-control](https://github.com/hypermedia-app/web-access-control#custom-authorization-checks)

For example, to enable authorization by `acl:agentGroup` us the following snippet:

```turtle
PREFIX knossos: <https://hypermedia.app/knossos#>
PREFIX code: <https://code.described.at/>

<>
  knossos:authorizationRule [
    code:implementedBy [
      a code:EcmaScript ;
      code:link <node:rdf-web-access-control/checks#agentGroup> ;  
    ] ;
  ] ;
.
```

## System account

Administrative access to the API is also possible using a system account. Having ran the `knossos init` command, a default ACL resource is generated, which grants the system account full control of all instances of `rdfs:Resource`:

```turtle
</api/authorization/system-controls-all>
   a acl:Authorization ;
   acl:agentClass knossos:SystemAccount ;
   acl:accessToClass rdfs:Resource ;
   acl:mode acl:Control ;
.
```

> [!TIP]
> The system account can be effectively disabled or fine-tuned by removing or modifying this ACL resource.

To authenticate as the system account, set the `Authorization` header as shown below.

```
Authorization: System token
```

The value of `token` is randomly generated when the application starts. Find in the application log output, in a message similar to:

```
System account authentication token: XApbsLsYRYeSS4ZU9QBEl
```

# Security

## Authentication

To set up an authentication middleware, run `knossos serve` with an additional argument

```
yarn knossos serve --authModule ../path/to/authentication.js
```

The value must be a module path, relative to the working directory. Also possible to provide a bare module specifier.

The module must have a default export of a function which returns an express `RequestHandler` or such a promise.

Upon successful authentication, the handler should set `req.agent` from a Graph Pointer, such as created by [clownface](https://zazuko.github.io/clownface).

### Example

To integrate [basic authentication](https://npm.im/basic-auth)

```typescript
import type { Authentication } from '@hydrofoil/knossos/server'
import auth from 'basic-auth'
import compare from 'tsscmp' 
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import { foaf, rdf } from '@tpluscode/rdf-ns-builders'

const authentication: Authentication = () => {
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

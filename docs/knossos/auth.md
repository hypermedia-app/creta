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

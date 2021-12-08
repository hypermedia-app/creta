# Using Knossos as middleware

It is possible to manually set up knossos in a larger express setup.

```js
import knossos from '@hydrofoil/knossos'
import express from 'express'

const app = express()
app.use(knossos({
    endpointUrl: 'http://localhost:3030/store/query',
    // all optional
    name: 'my-api',
    updateUrl: 'http://localhost:3030/store/update',
    path: '/api',
    codePath: '.',
    user: 'sparql-user',
    password: 'sparql-pass'
}))
```

---
"@hydrofoil/knossos": minor
"@hydrofoil/labyrinth": minor
---

All code references in RDF must use `code:implementedBy`

Affected predicates:

- `knossos:beforeSave`
- `knossos:preprocessPayload`
- `knossos:preprocessResource`
- `knossos:preprocessResponse`
- `query:filter`

For example, a which query used to be

```turtle
prefix code: <https://code.described.at/>
prefix query: <https://hypermedia.app/query#>

[
  query:filter
  [
    a code:EcmaScriptModule ;
    code:link <file:filters/articles/title.js#startsWith> ;
  ] ;
] .
```

must now become

```turtle
prefix code: <https://code.described.at/>
prefix query: <https://hypermedia.app/query#>

[
  query:filter
  [
    code:implementedBy
      [
        a code:EcmaScriptModule ;
        code:link <file:filters/articles/title.js#startsWith> ;
      ] ;
  ] ;
] .
```

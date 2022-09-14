# SHACL Validation

The default handlers for creating and updating resource will execute SHACL validation against shapes found in the store,
which match the given payload resource.

## Loading shapes

> [!API]
> `import type { ShapesQuery } from '@hydrofoil/knossos/lib/shacl'`
>
> [Open API docs](/api/interfaces/_hydrofoil_knossos_lib_shacl.shapesquery.html)

The default function which loads the shapes is fairly complex, trying to find shapes using deep nesting of `sh:and`, etc.,
and different possible targets by `sh:targetNode`, `sh:targetClass` and others.

It is possible to [override](./configuration.md#code-overrides) the function which loads these shape. For example, here's
a simpler implementation which only does a `DESCRIBE` of shapes matching target class.

```js
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { sh } from '@tpluscode/rdf-ns-builders'

export function shapesQuery({ types, sparql }) {
  return DESCRIBE`?shape`
    .WHERE`
      VALUES ?type { ${types} }
    
      ?shape ${sh.targetClass} ?type .
    `
    .execute(sparql.query)
}
```

Set it up in the configuration resource as:

```turtle
PREFIX code: <https://code.described.at/>
PREFIX schema: <http://schema.org/>
PREFIX knossos: <https://hypermedia.app/knossos#>

<>
  a knossos:Configuration ;
  knossos:override
    [
      schema:identifier <node:@hydrofoil/knossos/shacl.js#shapesQuery> ;
      code:implementedBy
        [
          a code:EcmaScriptModule ;
          code:link <file:apps/api/lib/shacl.js#shapesQuery> ;
        ] ;
    ];
.
```

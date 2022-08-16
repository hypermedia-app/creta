## Declarative code arguments

Code linked from RDF resources can receive additional arguments declaratively annotated in the graph. At the time of writing,
this includes:

* [Before save hooks](./hooks.md#before-save-hook) (as of `@hydrofoil/knossos@0.8`)
* [Resource hooks](./hooks.md#preprocess-hooks) (as of `@hydrofoil/knossos@0.8`)
* [Collection filters](../knossos/collections.md#queries) (as of `@hydrofoil/labyrinth@0.12`)
* [Template variable transform](../knossos/collections.md#transforming-variables) (as of `@hydrofoil/labyrinth@0.12`)
* [Middleware](../knossos/configuration.md#middleware) (as of `@hydrofoil/knossos@0.9.4`)
* [Resource loader](../knossos/configuration.md#resource-loader) (as of `@hydrofoil/knossos@0.9.4`)

All code import blocks follow the same pattern. They are objects of their respective property and require at least a 
`code:implementedBy` property. For example, a [before save hook](./hooks.md#before-save-hook) could look like:

```turtle
prefix hydra: <http://www.w3.org/ns/hydra/core#>
prefix knossos: <https://hypermedia.app/knossos#>
prefix code: <https://code.described.at/>

<>
  a hydra:Class ;
  knossos:beforeSave
    [
      code:implementedBy
        [
          a code:EcmaScriptModule ;
          code:link <file:lib/changeset.js#saveChangeset> ;
        ] ;
    ] ;
.
```

Additional arguments can be added to the code graph node by adding object(s) to the `code:arguments` property. Loaded args
will be added to the invocation of the linked function. Both positional and named arguments are supported.

### Positional arguments

Object of `code:arguments` must be and RDF List. Here's an idea for a variadic array of properties to ignore from the
changeset:

```diff
PREFIX acl: <http://www.w3.org/ns/auth/acl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix hydra: <http://www.w3.org/ns/hydra/core#>
prefix knossos: <https://hypermedia.app/knossos#>
prefix code: <https://code.described.at/>

<>
  a hydra:Class ;
  knossos:beforeSave
    [
      code:implementedBy
        [
          a code:EcmaScriptModule ;
          code:link <file:lib/changeset.js#saveChangeset> ;
        ] ;
+     code:arguments
+       (
+         rdfs:label
+         rdfs:comment
+         acl:owner
+       )
    ] ;
.
```

The actual invocation will look like this:

```js
export function saveChangeset(hook, ...ignoredProperties) {
  // ignoredProperties will be an array containing the three property names:
  // rdfs:label, rdfs:comment and acl:owner
}
```

### Named arguments

Alternatively, named arguments can be provided by setting name/value objects to the `code:arguments` property instead.

```diff
PREFIX acl: <http://www.w3.org/ns/auth/acl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix hydra: <http://www.w3.org/ns/hydra/core#>
prefix knossos: <https://hypermedia.app/knossos#>
prefix code: <https://code.described.at/>

<>
  a hydra:Class ;
  knossos:beforeSave
    [
      code:implementedBy
        [
          a code:EcmaScriptModule ;
          code:link <file:lib/changeset.js#saveChangeset> ;
        ] ;
+     code:arguments
+       [
+         code:name "ignoredProperties" ;
+         code:value
+           [
+             a code:EcmaScriptModule ;
+             code:link <file:lib/changeset.js#ignoreNothing> ;
+           ] ;
+       ] ;  
    ] ;
.
```

Now the `changeset.js` would be implemented like

```js
export function saveChangeset(hook, { getIgnoredProperties }) {
  // ignoredProperties will be set to the ignoreNothing below
}

export function ignoreNothing() {
  return []
}
```

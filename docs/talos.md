# @hydrofoil/talos

Talos is a command-line tool, which creates a bridge between minimal resources necessary to start a creta-based project, and a specific instance of said project.

Use it to bootstrap and update core resources of an API, which are necessary for it to function.

## PUT resources

The `put` command inserts resources and vocabularies into the app database. It would be used at least once, to prepare a database for deployment, and any time the source files would change, such as when applying manual modifications, or after an update from running `knossos init`.

Every RDF files under the `dirs` paths, relative to the current working directory, will be parsed with base URI being the `api` argument combined with the file path.

For example, th project directory structure below will create resources `/api/class/User`, `/user/john` and `/user-group/moderators`.

```
.
├── lib/
├── resources/
│   ├── api/
│   │   └── class/
│   │       └── User.nq
│   ├── user/
│   │   └── john.jsonld
│   └── user-group/
│       └── moderators.ttl
└── package.json
```

Use relative URI node to create links between the API resources, and an empty URI node to address the given resource itself. Here's what the file `moderators.ttl` could look like, making the user John a member of the moderators group:

```turtle
prefix vcard: <http://www.w3.org/2006/vcard/ns#>

<> 
  a vcard:Group ;
  vcard:hasMember </user/john> ;
.
```

### Handling existing resource graphs

By default, any existing resource will be overwritten when running `talos put`. To preserve existing triples of a resource, add in its source file a prefix

```turtle
prefix talos: <existingResource:merge>
prefix vcard: <http://www.w3.org/2006/vcard/ns#>

<> 
  a vcard:Group ;
  vcard:n "Administrators" ;
.
```

> [!WARNING]
> Merging resources which contain blank nodes will result in duplicate values

To skip resources which already exist, use `prefix talos: <existingResource:skip>` instead.

### Splitting resource directories

A project can save its resources in multiple directories to keep its API-specific set separate from the default generated from `knossos init` or to prepare environment-specific sets so that developers can  quickly populate their local database.


```
.
├── lib/
├── resources/
├── resources.dev/
├── resources.prod/
└── package.json
```

Pass one or more directory names to the `put` command to choose which resources get inserted into the database.

```
talos put ./resources ./resources.dev
```

### Describing partial resources in multiple environments

Any given resource can have its representation's sources distributed across environment files. For example, an `/api/config`
resource can define its required triples in the base environment and optional overrides. 

```
.
├── lib/
├── resources/
│   └── api/
│       └── config.ttl
├── resources.dev/
│   └── api/
│       └── config.ttl
├── resources.prod/
│   └── api/
│       └── config.ttl
└── package.json
```

As of `v0.5`, talos will merge these representations across selected source directories passed to the `put` command.

In `resources/api/config.ttl` create a hash URI "placeholder" for env-specific extension:

[config](talos/put/base-config.ttl ':include :type=code turtle')

In `resources.dev/api/config.ttl` and `resources.prod/api/config.ttl` add the triples to merge with the base representation.

[config](talos/put/dev-config.ttl ':include :type=code turtle')

[config](talos/put/prod-config.ttl ':include :type=code turtle')

Calling `talos put resources resource.dev` or `talos put resources resource.prod` will set the value of `<#env-name>` to
`"DEV"` or `"PROD"` respectively.

### Replacing representations of other resources

In case the merging of environment representation is not desired, add a configuration prefix to the document in any 
environment

```turtle
PREFIX talos: <environmentRepresentation:replace>
```

Marked this way, only the last representation will be used when loading resources from multiple directories, determined 
by the order of them being passed to `talos put`.

> [!TIP]
> This configuration can also be used in `.trig` documents, affecting all resource graphs.

### `talos put --help`

[filename](talos/put.txt ':include')

## PUT Vocabs

An API server may require certain vocabularies to be inserted into the database in order to take advantage of reasoning across the data and metadata resources.

Running `talos put-vocabs` inserts a default set of vocabularies, which provide semantics for some commonly used terms:

* [Access Control](https://prefix.zazuko.com/prefix/acl:)
* [Activity Streams 2.0](https://prefix.zazuko.com/prefix/as:)
* [Hydra Core](https://prefix.zazuko.com/prefix/hydra:)
* [RDF Concepts](https://prefix.zazuko.com/prefix/rdf:)
* [RDF Schema](https://prefix.zazuko.com/prefix/rdfs:)
* [Shapes Constraint Language](https://prefix.zazuko.com/prefix/sh:)

### Additional vocabularies

API provider wishing to load additional vocabulary/ontology into their database can do so by sourcing them from a package compatible with [@zazuko/rdf-vocabularies](https://npm.im/@zazuko/rdf-vocabularies) (see below).

For example, to add [DASH Data Shapes](https://prefix.zazuko.com/prefix/dash:) and [GEO vocabulary](https://prefix.zazuko.com/prefix/geo:) in addition to the defaults, run

```
talos put-vocabs --extraVocabs @zazuko/rdf-vocabularies,dash,geo
```

> [!TIP]
> See Zazuko's template repository which can be used to create a custom package which exports just the right modules:
>
> [zazuko/build-your-vocabularies](https://github.com/zazuko/build-your-vocabularies)

### `talos put-vocabs --help`

[filename](talos/put-vocabs.txt ':include')

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

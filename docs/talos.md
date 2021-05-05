# @hydrofoil/talos

Talos is a command-line tool, which creates a bridge between minimal resources necessary to start a creta-based project, and a specific instance of said project.

## PUT resources

The `put` command inserts resources and vocabularies into the app database. It would be used at least once, to prepare a database for deployment, and any time the source files would change, such as when applying manual modifications, or after an update from running `knossos init`.

Every RDF files under the `dir` path, relative to the current working directory, will be parsed with base URI being the `api` argument combined with the file path.

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

### CLI help text

```
$ /project talos put --help
Usage: talos put [options]

Options:
  --api <api>                
  --endpoint <endpoint>      
  --vocabs                   Insert required vocabularies to store (default: false)
  --resources                Insert resources (default: false)
  --token <token>            System authentication token
  -u, --user <user>          
  -p, --password <password>  
  -d, --dir <dir>            Directory with resource to bootstrap (default: "./resources")
  --apiPath <apiPath>        The path of the API Documentation resource (default: "/api")
  -h, --help                 display help for command
```

## GET resources

TBD

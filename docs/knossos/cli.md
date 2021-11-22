# @hydrofoil/knossos

Knossos is mainly meant to be used as a command-line tools which prepares and serves data-centric Hydra APIs.

### `knossos init`

```
Usage: knossos init [options] [packages...]

Populates the initial directory structure of resource files in turtle format

Arguments:
  packages    Additional package names to source initial resources

Options:
  -h, --help  display help for command
```

### `knossos serve`

```
Usage: knossos serve [options] <endpoint>

Options:
  -p, --port <port>          Port (default: 8888)
  --api <api>                Api Documentation path (default: "/api")
  --base
  --codePath <codePath>      Code path for hydra-box (default: ".")
  --updateUrl <updateUrl>    SPARQL Update Endpoint URL
  -n, --name <name>          App name (default: "knossos")
  --user <user>              SPARQL username
  --password <password>      SPARQL password
  --routeRegex <routeRegex>  Base path pattern to apply to prefix the knossos middleware
  -h, --help                 display help for command
```

> [!TIP]
> In development environment you might use `knossos-ts` binary instead, which supports TypeScript modules.

#### routeRegex

Use the `--routeRegex` option to serve the API from a sub-path. Because this is a regular expression, it can provide multiple prefixes. For example, to serve multiple APIs on their separate paths as well an API in the root you can call it like:

```
knossos --routeRegex "/\(clients|projects|employees\)?"
```

Notice the question mark at the end? This will have knossos serve 4 APIs:

- `/`
- `/client`
- `/projects`
- `/employees`

> [!WARNING]
> Remember about proper escaping the pattern in shell and scripts

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
  --authModule <authModule>  Authentication module. Must default-export an express handler factory. Can be lazy.
  -h, --help                 display help for command

```

> [!TIP]
> In development environment you might use `knossos-ts` binary instead, which supports TypeScript modules.

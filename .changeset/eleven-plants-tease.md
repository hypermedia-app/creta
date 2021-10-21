---
"@hydrofoil/knossos": minor
---

All consumer middleware must be defined in resource graph

BREAKING CHANGE:

With the `--authModule` CLI option now gone, authentication middleware now has to be linked from a configuration resource. See [docs](https://creta.hypermedia.app/#/knossos/auth) for details.

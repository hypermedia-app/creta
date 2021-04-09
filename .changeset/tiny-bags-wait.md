---
"@hydrofoil/labyrinth": minor
---

Breaking changes:
- Extracted `protectedResource` export to package `@hydrofoil/labyrinth-jwt-permissions`
  - Removed all `auth` features from core
- Decoupled logic creating hydra-box API
  - `@hydrofoil/minotaur` loads local RDF files
  - `@hydrofoil/knossos` loads `hydra:ApiDocumentation` from store
- default `SparqlQueryLoader` uses default graph (assumes Union Graph is queries)

---
"@hydrofoil/shape-to-query": minor
---

Changed the signature of `shapeToPatterns`. Now it returns an object with functions to create full `CONSTRUCT` and `WHERE` clauses
and implements the `Iterable<SparqlTemplateResult>` interface

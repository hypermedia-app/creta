---
"@hydrofoil/labyrinth": patch
---

Resource#GET: In case of some `query:include` paths, resources would be `DESCRIBE`-d twice, causing duplicate blank nodes

---
"@hydrofoil/talos": patch
---

Resource paths were not encoded which caused Bad Request on SPARQL Update if they contained spaces or other characters not allowed in URLs

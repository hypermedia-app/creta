---
"@hydrofoil/knossos": patch
---

API documentation excludes classes which do not have a `hydra:supportedOperation`

This caused classes which only had a `hydra:supportedProperty` to not appear in the `ApiDocumentation` resource

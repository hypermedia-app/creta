# Error handling

Errors in a Creta API are handled using [express-http-problem-details](https://www.npmjs.com/package/express-http-problem-details).
It works by mapping error instances to problem documents (`application/problem+json`).

## Custom error mappers

Export a class which implements an [error mapper](https://github.com/PDMLab/http-problem-details-mapper). It can but does
not have to extend the base class. It's enough to implement the required members. The class must have a parameterless 
constructor.

```typescript
import type { IErrorMapper } from 'http-problem-details-mapper'
import { ProblemDocument } from 'http-problem-details'

export class ShaclValidationMapper implements IErrorMapper {
  readonly error = 'ShaclValidationReport'

  mapError(report: ShaclValidationReport) {
    return new ProblemDocument({
      status: 400,
      title: 'Validation failed'
    }, {
      report,  
    })
  }
}
```

Then import the mapper in knossos' configuration:

[config](errorHandling/mapperConfiguration.ttl ':include :type=code turtle')

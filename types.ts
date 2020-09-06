/* c8 ignore next */
import { HydraBox } from 'hydra-box'
import StreamClient from 'sparql-http-client/StreamClient'

declare module 'express-serve-static-core' {

  export interface Request {
    user?: {
      id: string
    }
    sparql: StreamClient
    hydra: HydraBox
  }
}

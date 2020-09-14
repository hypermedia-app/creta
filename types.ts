/* c8 ignore next */
import { HydraBox } from 'hydra-box'

declare module 'express-serve-static-core' {

  export interface Request {
    user?: {
      id: string
    }
    hydra: HydraBox
  }
}

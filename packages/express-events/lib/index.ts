import { GraphPointer } from 'clownface'
import { Handler } from '..'

export interface RuntimeHandler {
  pointer: GraphPointer
  impl: Handler | undefined
  handled?: boolean
}

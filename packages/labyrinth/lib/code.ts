import { Api } from 'hydra-box/Api'
import { GraphPointer } from 'clownface'

export interface CodeLoader {
  <T = unknown>(node: GraphPointer, options?: Record<any, any>): T | Promise<T> | null
}

export function codeLoader(api: Api): CodeLoader {
  return (node, options) => {
    return api.loaderRegistry.load<any>(node, {
      basePath: api.codePath,
      ...(options || {}),
    })
  }
}

export { put } from './put'
export { putVocabs } from './put-vocabs'

export interface Command {
  endpoint: string
  updateEndpoint?: string
  token?: string
  user?: string
  password?: string
}

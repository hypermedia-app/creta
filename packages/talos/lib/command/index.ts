export { put } from './put'
export { putVocabs } from './put-vocabs'

export interface Command {
  endpoint: string
  token?: string
  user?: string
  password?: string
}

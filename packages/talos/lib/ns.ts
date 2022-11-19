import namespace from '@rdfjs/namespace'

type TalosTerms =
  'resources' |
  'action' |
  'default' |
  'overwrite' |
  'skip' |
  'merge'|
  'environmentRepresentation' |
  'replace'

export const talosNs = namespace<TalosTerms>('urn:talos:')

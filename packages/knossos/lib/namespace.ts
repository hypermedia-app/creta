import namespace from '@rdfjs/namespace'

type KnossosTerms = 'createWithPUT' | 'memberTemplate'

export const knossos = namespace<KnossosTerms>('https://hypermedia.app/knossos#')

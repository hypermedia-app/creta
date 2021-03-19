import namespace from '@rdfjs/namespace'

type KnossosTerms = 'createWithPUT' | 'memberTemplate' | 'SystemAccount' | 'System' | 'beforeSave'

export const knossos = namespace<KnossosTerms>('https://hypermedia.app/knossos#')
export const events = namespace('https://hypermedia.app/events#')

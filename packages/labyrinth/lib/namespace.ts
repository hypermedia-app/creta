import namespace from '@rdfjs/namespace'

type AuthTerms = 'required' | 'scopes' | 'permissions'

export const hydraBox = namespace('http://hydra-box.org/schema/')
export const query = namespace('http://hypermedia.app/query#')
export const auth = namespace<AuthTerms>('http://hypermedia.app/auth#')
export const code = namespace('https://code.described.at/')

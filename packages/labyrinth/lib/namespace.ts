import namespace from '@rdfjs/namespace'

type AuthTerms = 'required' | 'scopes' | 'permissions' | 'access'

export const hydraBox = namespace('http://hydra-box.org/schema/')
export const query = namespace('https://hypermedia.app/query#')
export const auth = namespace<AuthTerms>('https://hypermedia.app/auth#')
export const code = namespace('https://code.described.at/')
export const acl = namespace('http://www.w3.org/ns/auth/acl#')

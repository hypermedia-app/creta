import { AclPatterns } from 'hydra-box-web-access-control'
import { sparql } from '@tpluscode/rdf-string'
import { hydra } from '@tpluscode/rdf-ns-builders/strict'

export const filterAclByApi: AclPatterns = (acl, req) => {
  return sparql`${acl} ${hydra.apiDocumentation} ${req.hydra.api.term!}`
}

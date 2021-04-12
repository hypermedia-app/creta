import { NamedNode } from 'rdf-js'
import StreamClient, { StreamClientOptions } from 'sparql-http-client'
import { INSERT } from '@tpluscode/sparql-builder'
import { acl, rdfs } from '@tpluscode/rdf-ns-builders'
import $rdf from 'rdf-ext'
import { sparql } from '@tpluscode/rdf-string'
import { knossos } from '@hydrofoil/knossos/lib/namespace'

const insertAcl = (term: NamedNode) => INSERT.DATA`
${term} a ${acl.Authorization} ;
        ${acl.accessToClass} ${rdfs.Resource} ;
        ${acl.mode} ${acl.Control} ;
        ${acl.agentClass} ${knossos.SystemAccount} ;
.
`

type Options = StreamClientOptions & {
  api: string
}

export async function insertSystemAcl({ api, ...options }: Options): Promise<void> {
  const client = new StreamClient(options)

  const aclResource = $rdf.namedNode(`${api}/api/authorization/system-controls-all`)

  await client.query.update(sparql`DROP SILENT GRAPH ${aclResource}`.toString())
  await insertAcl(aclResource).execute(client.query)
}

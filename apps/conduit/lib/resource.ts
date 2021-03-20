import { acl, dash, owl, rdf, sh, vcard } from '@tpluscode/rdf-ns-builders'
import { BeforeSave } from '@hydrofoil/knossos/lib/resource'
import TermSet from '@rdfjs/term-set'
import type { Handler } from '@hydrofoil/express-events'
import { GraphPointer } from 'clownface'
import $rdf from 'rdf-ext'

export const guardReadOnlyPredicates: BeforeSave = function ({ after, before, api }): void {
  if (!before.dataset.size) return

  const readOnlyProps = api.node(after.out(rdf.type))
    .out(sh.property)
    .has(dash.readOnly, true)
    .out(sh.path)

  for (const prop of readOnlyProps.toArray()) {
    const beforeTerms = new TermSet(before.out(prop).terms)
    const afterTerms = [...new TermSet(after.out(prop).terms)]
    if (afterTerms.some(term => !beforeTerms.has(term))) {
      throw new Error(`Cannot modify property ${prop.value}`)
    }
  }
}

function userUrn(user: GraphPointer) {
  const uid = user.out(vcard.hasUID).value

  if (!uid) {
    throw new Error('No UID')
  }

  return $rdf.namedNode(`urn:user:${uid}`)
}

export const setUID: Handler = async function ({ req, event }) {
  if (!event.object) {
    req.knossos.log('Could not set User UID. No Activity#object')
    return
  }
  if (!req.user?.pointer) {
    req.knossos.log('Could not set User UID. No authenticated user')
    return
  }

  req.knossos.log('Setting UID of <%s>', event.object.id.value)
  const resource = await req.knossos.store.load(event.object.id)
  resource.addOut(vcard.hasUID, req.user.pointer.out(vcard.hasUID))
    .addOut(owl.sameAs, userUrn(req.user.pointer))
  await req.knossos.store.save(resource)
}

export const setOwner: Handler = async function ({ event, req }) {
  if (!event.object) {
    req.knossos.log('Could not set owner of resource. No Activity#object')
    return
  }
  if (!req.user?.pointer) {
    req.knossos.log('Could not set owner of resource. No authenticated user')
    return
  }

  req.knossos.log('Setting <%s> as owner of <%s>', req.user.pointer.value, event.object.id.value)
  const resource = await req.knossos.store.load(event.object.id)
  resource.addOut(acl.owner, req.user.pointer)
  await req.knossos.store.save(resource)
}

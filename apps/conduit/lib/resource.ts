import { acl, dash, rdf, sh, vcard } from '@tpluscode/rdf-ns-builders'
import { BeforeSave } from '@hydrofoil/knossos/lib/resource'
import TermSet from '@rdfjs/term-set'

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

export const setUID: BeforeSave = function ({ after, user }) {
  if (user?.pointer) {
    after.deleteOut(vcard.hasUID).addOut(vcard.hasUID, user.pointer.out(vcard.hasUID))
  }
}

export const setOwner: BeforeSave = function ({ after }) {
  after.deleteOut(acl.owner).addOut(acl.owner, after.term)
}

import express from 'express'
import clownface, { AnyPointer, GraphPointer } from 'clownface'
import { NamedNode } from 'rdf-js'
import $rdf from 'rdf-ext'
import { rdf, rdfs } from '@tpluscode/rdf-ns-builders'

declare module 'express-serve-static-core' {
  export interface Request {
    resource(): Promise<GraphPointer<NamedNode>>
  }

  interface Response {
    resource(resource: AnyPointer): Promise<void>
  }
}

declare module 'rdf-js' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Stream extends AsyncIterable<Quad> {}
}

const emptyNamedNode = $rdf.namedNode('')

export const resource = (getTerm: (req: express.Request) => NamedNode) => (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  req.resource = async () => {
    const term = getTerm(req)
    if (!term) {
      throw new Error('Could not determine request term.')
    }

    const dataset = $rdf.dataset()

    if (!req.dataset) {
      return clownface({ dataset }).node(term)
    }

    for (const quad of await req.dataset()) {
      const { predicate, graph } = quad
      const subject = quad.subject.equals(emptyNamedNode) ? term : quad.subject
      const object = quad.object.equals(emptyNamedNode) ? term : quad.object

      dataset.add($rdf.quad(subject, predicate, object, graph))
    }

    return clownface({ dataset }).namedNode(term).addOut(rdf.type, rdfs.Resource)
  }

  res.resource = (pointer: AnyPointer) => res.dataset(pointer.dataset)

  next()
}

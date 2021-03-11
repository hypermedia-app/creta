import express from 'express'
import clownface, { AnyPointer, GraphPointer } from 'clownface'
import { NamedNode, Quad } from 'rdf-js'
import $rdf from 'rdf-ext'

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

export function resource(req: express.Request, res: express.Response, next: express.NextFunction) {
  req.resource = async () => {
    const dataset = $rdf.dataset()

    if (!req.dataset) {
      return clownface({ dataset }).node(req.hydra.term)
    }

    for (const quad of await req.dataset()) {
      const { predicate, graph } = quad
      const subject = quad.subject.equals(emptyNamedNode) ? req.hydra.term : quad.subject
      const object = quad.object.equals(emptyNamedNode) ? req.hydra.term : quad.object

      dataset.add($rdf.quad(subject, predicate, object, graph))
    }

    return clownface({ dataset }).namedNode(req.hydra.term)
  }

  res.resource = (pointer: AnyPointer) => res.dataset(pointer.dataset)

  next()
}

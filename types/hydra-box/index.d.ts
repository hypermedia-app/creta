declare module 'hydra-box' {
  import {Request, RequestHandler, Router} from 'express';
  import Api = require('hydra-box/Api');
  import {DatasetCore, Term, NamedNode, Stream} from 'rdf-js';
  import {GraphPointer} from 'clownface';

  function middleware(api: Api, options: hydraBox.Options): Router

  namespace hydraBox {
    interface Options {
      baseIriFromRequest?: boolean
      loader?: hydraBox.ResourceLoader
      store?: any
      middleware?: {
        resource?: RequestHandler | RequestHandler[]
        operations?: RequestHandler | RequestHandler[]
      }
    }

    interface ObjectResource {
      term: NamedNode,
      prefetchDataset: DatasetCore
      pointer(): Promise<GraphPointer<NamedNode>>
      dataset(): Promise<DatasetCore>
      quadStream(): Stream
      types: Set<NamedNode>
    }

    interface PropertyResource extends ObjectResource {
      property: Term;
      object: Term;
    }

    interface ResourceLoader {
      forClassOperation(term: Term, req: Request): Promise<Array<ObjectResource>>

      forPropertyOperation(term: Term, req: Request): Promise<Array<PropertyResource>>
    }

    interface PotentialOperation {
      resource: ObjectResource | PropertyResource
      operation: GraphPointer
    }

    interface HydraBox {
      api: Api;
      term: NamedNode;
      resource: ObjectResource;
      operation: GraphPointer
      operations: PotentialOperation[]
    }
  }

  const hydraBox: {
    Api: Api;
    middleware: typeof middleware;
  }

  export = hydraBox
}

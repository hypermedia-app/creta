declare module 'hydra-box' {
    import {Request, RequestHandler, Router} from 'express';
    import Api = require('hydra-box/Api');
    import {DatasetCore, Term, NamedNode} from 'rdf-js';
    import {GraphPointer} from 'clownface';

    interface Options {
        baseIriFromRequest?: boolean
        loader?: hydraBox.ResourceLoader
        store?: any
        middleware?: {
            resource: RequestHandler | RequestHandler[]
        }
    }

    function middleware(api: Api, options: Options): Router

    namespace hydraBox {
        interface Resource {
            term: Term,
            dataset: DatasetCore,
            types: Set<Term>
        }

        interface PropertyResource extends Resource {
            property: Term;
            object: Term;
        }

        interface ResourceLoader {
            forClassOperation (term: Term, req: Request): Promise<Array<Resource>>
            forPropertyOperation (term: Term, req: Request): Promise<Array<PropertyResource>>
        }

        interface HydraBox {
          api: Api;
          term: NamedNode;
          resource: {
            term: NamedNode;
            dataset: DatasetCore;
            types: Set<NamedNode>;
          };
          operation: GraphPointer
        }
    }

    const hydraBox: {
        Api: Api;
        middleware: typeof middleware;
    }

    export = hydraBox
}

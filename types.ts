import {GraphPointer} from 'clownface';
import {DatasetCore, NamedNode} from 'rdf-js';
import Api from 'hydra-box/Api'
import StreamClient from 'sparql-http-client/StreamClient'

declare module 'express-serve-static-core' {

    export interface Request {
        user?: {
            id: string
        },
        sparql: StreamClient,
        hydra: {
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
}

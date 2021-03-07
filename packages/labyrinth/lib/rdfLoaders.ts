import LoaderRegistry from 'rdf-loaders-registry'
import EcmaScriptLoader from 'rdf-loader-code/ecmaScript'
import EcmaScriptLiteralLoader from 'rdf-loader-code/ecmaScriptLiteral'

export const loaders = new LoaderRegistry()
EcmaScriptLoader.register(loaders)
EcmaScriptLiteralLoader.register(loaders)

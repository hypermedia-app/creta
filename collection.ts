import asyncMiddleware from 'middleware-async'
import clownface, { AnyPointer } from 'clownface'
import $rdf from 'rdf-ext'
import { DatasetCore } from 'rdf-js'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import { hex, hydraBox, query } from './lib/namespace'
import { IriTemplate, IriTemplateMixin } from '@rdfine/hydra'
import { getMemberQuery } from './lib/query/collection'
import { loadLinkedResources } from './lib/query/eagerLinks'

const pageSize = 12

function templateParamsForPage(query: AnyPointer, page: number) {
  const clone = clownface({ dataset: $rdf.dataset([...query.dataset]) })
      .in().toArray()[0]

  if (!clone) {
    return clownface({ dataset: $rdf.dataset() }).blankNode().addOut(hydra.pageIndex, page)
  }

  return clone.deleteOut(hydra.pageIndex).addOut(hydra.pageIndex, page)
}

export const get = asyncMiddleware(async (req, res) => {
  const dataset = $rdf.dataset([...req.hydra.resource.dataset])
  const collection = clownface({ dataset }).namedNode(req.hydra.resource.term)

  let request = clownface<DatasetCore>({ dataset: $rdf.dataset() })
  if (req.dataset) {
    request = clownface({ dataset: await req.dataset() })
  }
  const templateVariables = req.hydra.operation.out(hydraBox.variables)
  const includeLinked = req.hydra.operation.out(query.include)

  let template: IriTemplate | null = null
  if (templateVariables.term) {
    template = new IriTemplateMixin.Class(templateVariables.toArray()[0] as any)
  }
  const pageQuery = await getMemberQuery(clownface(req.hydra.api), collection, request, template, pageSize, req.hydra.api.codePath)

  const page = await pageQuery.members.execute(req.sparql.query)
  let total = 0
  for await (const result of await pageQuery.totals.execute(req.sparql.query)) {
    total = Number.parseInt(result.count.value)
    collection.addOut(hydra.totalItems, total)
  }
  await dataset.import(page)

  collection.namedNode(req.hydra.resource.term)
      .addOut(hydra.member, clownface({ dataset }).has(rdf.type, collection.out(hydra.manages).has(hydra.property, rdf.type).out(hydra.object)))

  dataset.addAll(await loadLinkedResources(collection.out(hydra.member), includeLinked, req.sparql))

  if (template) {
    collection.addOut(hex.currentMappings, currMappings => {
      template!.mapping.forEach(mapping => {
        const property = mapping.property.id
        currMappings.addOut(property, request.out(property))
      })
    })

    collection
        .addOut(hydra.view, view => {
          const pageIndex = Number.parseInt(request.out(hydra.pageIndex).value || '1')
          const totalPages = Math.floor(total / pageSize) + 1

          view.addOut(rdf.type, hydra.PartialCollectionView)
          view.addOut(hydra.first, $rdf.namedNode(template!.expand(templateParamsForPage(request, 1))))
          view.addOut(hydra.last, $rdf.namedNode(template!.expand(templateParamsForPage(request, totalPages))))
          if (pageIndex > 1) {
            view.addOut(hydra.previous, $rdf.namedNode(template!.expand(templateParamsForPage(request, pageIndex - 1))))
          }
          if (pageIndex < totalPages) {
            view.addOut(hydra.next, $rdf.namedNode(template!.expand(templateParamsForPage(request, pageIndex + 1))))
          }
        })
  }

  res.setLink(req.hydra.resource.term.value, 'canonical')
  res.dataset(dataset)
})

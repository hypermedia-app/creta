import asyncMiddleware from 'middleware-async'
import clownface, { AnyPointer, GraphPointer, MultiPointer } from 'clownface'
import $rdf from 'rdf-ext'
import { ResourceIdentifier } from '@tpluscode/rdfine'
import { Request } from 'express'
import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import { IriTemplate, IriTemplateMixin } from '@rdfine/hydra'
import { hydraBox, query } from './lib/namespace'
import { getSparqlQuery } from './lib/query/collection'
import { loadLinkedResources } from './lib/query/eagerLinks'
import { protectedResource } from './resource'

const pageSize = 12
const emptyDataset = clownface({ dataset: $rdf.dataset() })

function templateParamsForPage(query: AnyPointer, page: number) {
  const clone = clownface({ dataset: $rdf.dataset([...query.dataset]) })
    .in().toArray()[0]

  if (!clone) {
    return clownface({ dataset: $rdf.dataset() }).blankNode().addOut(hydra.pageIndex, page)
  }

  if (page === 1) {
    return clone.deleteOut(hydra.pageIndex)
  }

  return clone.deleteOut(hydra.pageIndex).addOut(hydra.pageIndex, page)
}

function getTemplate(req: Request): IriTemplate | null {
  const templateVariables = req.hydra.operation.out(hydraBox.variables) as MultiPointer<ResourceIdentifier>
  if (templateVariables.term) {
    return new IriTemplateMixin.Class(templateVariables.toArray()[0])
  }

  return null
}

function addTemplateMappings(collection: GraphPointer, template: IriTemplate, request: AnyPointer = emptyDataset): void {
  collection.addOut(query.templateMappings, currMappings => {
    template.mapping.forEach(mapping => {
      const property = mapping.property.id
      currMappings.addOut(property, request.out(property))
    })
  })
}

function addCollectionViews(collection: GraphPointer, total: number, template: IriTemplate, request: AnyPointer = emptyDataset): void {
  if (!template.mapping.some(m => m.property.equals(hydra.pageIndex))) {
    return
  }

  collection
    .addOut(hydra.view, view => {
      const pageIndex = Number.parseInt(request.out(hydra.pageIndex).value || '1')
      const totalPages = Math.floor(total / pageSize) + 1

      view.addOut(rdf.type, hydra.PartialCollectionView)
      view.addOut(hydra.first, $rdf.namedNode(template.expand(templateParamsForPage(request, 1))))
      view.addOut(hydra.last, $rdf.namedNode(template.expand(templateParamsForPage(request, totalPages))))
      if (pageIndex > 1) {
        view.addOut(hydra.previous, $rdf.namedNode(template.expand(templateParamsForPage(request, pageIndex - 1))))
      }
      if (pageIndex < totalPages) {
        view.addOut(hydra.next, $rdf.namedNode(template.expand(templateParamsForPage(request, pageIndex + 1))))
      }
    })
}

export const get = protectedResource(asyncMiddleware(async (req, res) => {
  const dataset = $rdf.dataset([...req.hydra.resource.dataset])
  const collection = clownface({ dataset }).namedNode(req.hydra.resource.term)

  let request: AnyPointer | undefined
  if (req.dataset) {
    request = clownface({ dataset: await req.dataset() })
  }

  const includeLinked = req.hydra.operation.out(query.include)

  const template = getTemplate(req)

  const pageQuery = await getSparqlQuery({
    api: clownface(req.hydra.api),
    collection,
    query: request,
    variables: template,
    pageSize,
    basePath: req.hydra.api.codePath,
  })

  let total = 0
  if (pageQuery) {
    const page = await pageQuery.members.execute(req.app.sparql.query)
    const totals = pageQuery.totals.execute(req.app.sparql.query)
    for await (const result of await totals) {
      total = Number.parseInt(result.count.value)
    }
    await collection.dataset.import(page)
  }
  collection.addOut(hydra.totalItems, total)

  collection.namedNode(req.hydra.resource.term)
    .addOut(hydra.member, clownface({ dataset }).has(rdf.type, collection.out(hydra.manages).has(hydra.property, rdf.type).out(hydra.object)))

  dataset.addAll(await loadLinkedResources(collection.out(hydra.member), includeLinked, req.app.sparql))

  if (template) {
    addTemplateMappings(collection, template, request)
    addCollectionViews(collection, total, template, request)
  }

  res.setLink(req.hydra.resource.term.value, 'canonical')
  return res.dataset(dataset)
}))

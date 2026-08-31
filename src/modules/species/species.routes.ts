import type { FastifyPluginAsync } from 'fastify'
import { SpeciesController } from './species.controller'
import { SpeciesRepository } from './species.repository'
import { SpeciesService } from './species.service'

const speciesRepository = new SpeciesRepository()
const speciesService = new SpeciesService(speciesRepository)
const speciesController = new SpeciesController(speciesService)

export const speciesRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/', (request, reply) =>
    speciesController.getSpecies(request, reply)
  )
  fastify.get('/:id', (request, reply) =>
    speciesController.getSpeciesById(request, reply)
  )
}

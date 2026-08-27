import type { FastifyPluginAsync } from 'fastify'
import { speciesController } from './species.controller'

export const speciesRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/', speciesController.getSpecies)
  fastify.get('/:id', speciesController.getSpeciesById)
}

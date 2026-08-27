import type { FastifyReply, FastifyRequest } from 'fastify'
import { GetSpeciesByIdParamsSchema } from './species.schema'
import { speciesService } from './species.service'

export class SpeciesController {
  async getSpecies(_request: FastifyRequest, reply: FastifyReply) {
    const species = await speciesService.getSpecies()

    return reply.send(species)
  }

  async getSpeciesById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = GetSpeciesByIdParamsSchema.parse(request.params)
    const specie = await speciesService.getSpeciesById(id)

    return reply.send(specie)
  }
}

export const speciesController = new SpeciesController()

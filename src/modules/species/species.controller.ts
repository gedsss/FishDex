import type { FastifyReply, FastifyRequest } from 'fastify'
import { GetSpeciesByIdParamsSchema } from './species.schema'
import type { SpeciesService } from './species.service'

export class SpeciesController {
  constructor(private speciesService: SpeciesService) {}

  async getSpecies(_request: FastifyRequest, reply: FastifyReply) {
    const species = await this.speciesService.getSpecies()

    return reply.send(species)
  }

  async getSpeciesById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = GetSpeciesByIdParamsSchema.parse(request.params)
    const specie = await this.speciesService.getSpeciesById(id)

    return reply.send(specie)
  }
}

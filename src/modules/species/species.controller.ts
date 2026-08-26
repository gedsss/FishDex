import { FastifyRequest, FastifyReply } from "fastify";
import { speciesService } from "./species.service";
import { GetSpeciesByIdParamsSchema } from "./species.schema";

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

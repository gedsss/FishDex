import { speciesRepository } from "./species.repository";
import { NotFoundError } from "../../shared/errors";

export class SpeciesService {
    async getSpecies() {
        return speciesRepository.getSpecies()
    }

    async getSpeciesById(id: string) {
        const species = await speciesRepository.getSpeciesById(id)

        if (!species) {
            throw new NotFoundError('Species not found')
        }

        return species
    }
}

export const speciesService = new SpeciesService()

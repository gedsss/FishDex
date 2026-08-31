import { NotFoundError } from '../../shared/errors'
import type { SpeciesRepository } from './species.repository'

export class SpeciesService {
  constructor(private speciesRepository: SpeciesRepository) {}

  async getSpecies() {
    return this.speciesRepository.getSpecies()
  }

  async getSpeciesById(id: string) {
    const species = await this.speciesRepository.getSpeciesById(id)

    if (!species) {
      throw new NotFoundError('Species not found')
    }

    return species
  }
}

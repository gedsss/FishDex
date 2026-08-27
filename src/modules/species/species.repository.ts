import { prisma } from '../../../prisma/prisma.client'

export class SpeciesRepository {
  async getSpecies() {
    const species = await prisma.species.findMany()

    return species
  }

  async getSpeciesById(id: string) {
    const specie = await prisma.species.findUnique({
      where: { id },
    })

    return specie
  }
}

export const speciesRepository = new SpeciesRepository()

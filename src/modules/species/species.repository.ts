import { prisma } from '../../../prisma/prisma.client'

export class SpeciesRepository {
  async getSpecies() {
    // dexOrder define a numeração estável do Dex no app (#001…); name como
    // desempate para espécies sem dexOrder definido.
    const species = await prisma.species.findMany({
      orderBy: [{ dexOrder: 'asc' }, { name: 'asc' }],
    })

    return species
  }

  async getSpeciesById(id: string) {
    const specie = await prisma.species.findUnique({
      where: { id },
    })

    return specie
  }
}

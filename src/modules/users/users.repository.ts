import { prisma } from '../../../prisma/prisma.client'

export class UserRepository {
  async findById(id: string) {
    const user = prisma.user.findUnique({
      where: { id },
    })

    return user
  }

  async countCatchesBySpecies(userId: string) {
    const result = await prisma.catch.groupBy({
      by: ['speciesId'],
      where: { userId },
      _count: true,
    })

    return result
  }
}

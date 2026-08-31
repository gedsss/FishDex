import { prisma } from '../../../prisma/prisma.client'

export class FeedRepository {
  async findCatchesByUserIds(userIds: string[], page: number, limit: number) {
    const catches = await prisma.catch.findMany({
      where: {
        userId: { in: userIds },
      },
      orderBy: { capturedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return catches
  }
}

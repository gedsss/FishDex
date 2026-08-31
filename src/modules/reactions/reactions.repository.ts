import type { ReactionEmoji } from '../../../generated/prisma/enums'
import { prisma } from '../../../prisma/prisma.client'

export class ReactionsRepository {
  async upsertByCatchAndUser(
    catchId: string,
    userId: string,
    emoji: ReactionEmoji
  ) {
    return await prisma.reaction.upsert({
      where: {
        catchId_userId: { catchId, userId },
      },
      create: {
        catchId,
        userId,
        emoji,
      },
      update: {
        emoji,
      },
    })
  }

  async deleteByCatchAndUser(catchId: string, userId: string) {
    return await prisma.reaction.delete({
      where: {
        catchId_userId: { catchId, userId },
      },
    })
  }

  async countByCatchGroupedByEmoji(catchId: string) {
    return await prisma.reaction.groupBy({
      by: ['emoji'],
      where: {
        catchId,
      },
      _count: {
        emoji: true,
      },
    })
  }
}

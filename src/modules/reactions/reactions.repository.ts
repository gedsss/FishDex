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

  // Contagem de reações por emoji para várias capturas de uma vez (feed / listas).
  async countByCatchIdsGroupedByEmoji(catchIds: string[]) {
    if (catchIds.length === 0) return []

    return await prisma.reaction.groupBy({
      by: ['catchId', 'emoji'],
      where: {
        catchId: { in: catchIds },
      },
      _count: {
        emoji: true,
      },
    })
  }

  // Reação do próprio usuário (viewer) em cada captura de um conjunto.
  async findViewerReactions(catchIds: string[], userId: string) {
    if (catchIds.length === 0) return []

    return await prisma.reaction.findMany({
      where: {
        catchId: { in: catchIds },
        userId,
      },
      select: { catchId: true, emoji: true },
    })
  }
}

import { Prisma } from '../../../generated/prisma/client'
import type { ReactionEmoji } from '../../../generated/prisma/enums'
import { NotFoundError } from '../../shared/errors'
import type { CatchesRepository } from '../catches/catches.repository'
import type { ReactionsRepository } from './reactions.repository'

export class ReactionService {
  constructor(
    private reactionRepository: ReactionsRepository,
    private catchesRepository: CatchesRepository
  ) {}

  async react(catchId: string, userId: string, emoji: ReactionEmoji) {
    const exist = await this.catchesRepository.findById(catchId)

    if (!exist) {
      throw new NotFoundError('not found')
    }

    return await this.reactionRepository.upsertByCatchAndUser(
      catchId,
      userId,
      emoji
    )
  }

  async remove(catchId: string, userId: string) {
    try {
      return await this.reactionRepository.deleteByCatchAndUser(catchId, userId)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        throw new NotFoundError('reacao nao encontrada')
      throw error
    }
  }
}

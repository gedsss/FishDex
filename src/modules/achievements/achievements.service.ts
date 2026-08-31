import type { Difficulty } from '../../../generated/prisma/enums'
import { NotFoundError } from '../../shared/errors'
import type { UserRepository } from '../users/users.repository'
import { ACHIEVEMENT_CODES } from './achievements.constants'
import type { AchievementsRepository } from './achievements.repository'

export class AchievementsService {
  constructor(
    private achievementsRepository: AchievementsRepository,
    private userRepository: UserRepository
  ) {}

  async getAchievements() {
    return await this.achievementsRepository.getAchievements()
  }

  async getAchievementById(id: string) {
    const achievement = await this.achievementsRepository.getAchievementById(id)

    if (!achievement) {
      throw new NotFoundError('Achievement not found')
    }

    return achievement
  }

  async getUnlockedByUser(userId: string) {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new NotFoundError('Usuario nao encontrado')
    }

    const unlocked = await this.achievementsRepository.getUnlockedByUser(userId)

    return unlocked.map(userAchievement => ({
      code: userAchievement.achievement.code,
      name: userAchievement.achievement.name,
      description: userAchievement.achievement.description,
      iconUrl: userAchievement.achievement.iconUrl,
      unlockedAt: userAchievement.unlockedAt,
    }))
  }

  async checkAchievements(userId: string, context: { difficulty: Difficulty }) {
    const codesToUnlock: string[] = []

    const totalCatches =
      await this.achievementsRepository.countCatchesByUser(userId)
    if (totalCatches === 1) {
      codesToUnlock.push(ACHIEVEMENT_CODES.FIRST_CATCH)
    }

    const distinctSpecies =
      await this.achievementsRepository.countDistinctSpeciesByUser(userId)
    if (distinctSpecies === 10) {
      codesToUnlock.push(ACHIEVEMENT_CODES.TEN_SPECIES)
    }

    if (context.difficulty === 'LEGENDARY') {
      const legendaryCatches =
        await this.achievementsRepository.countLegendaryCatchesByUser(userId)
      if (legendaryCatches === 1) {
        codesToUnlock.push(ACHIEVEMENT_CODES.FIRST_LEGENDARY)
      }
    }

    for (const code of codesToUnlock) {
      const achievement = await this.achievementsRepository.findByCode(code)

      if (achievement) {
        await this.achievementsRepository.unlock(userId, achievement.id)
      }
    }
  }
}

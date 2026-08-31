import { prisma } from '../../../prisma/prisma.client'

export class AchievementsRepository {
  async getAchievements() {
    const achievements = await prisma.achievement.findMany()

    return achievements
  }

  async getAchievementById(id: string) {
    const achievement = await prisma.achievement.findUnique({
      where: { id },
    })

    return achievement
  }

  async findByCode(code: string) {
    const achievement = await prisma.achievement.findUnique({
      where: { code },
    })

    return achievement
  }

  async getUnlockedByUser(userId: string) {
    const unlocked = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    })

    return unlocked
  }

  async unlock(userId: string, achievementId: string) {
    const userAchievement = await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId } },
      update: {},
      create: { userId, achievementId },
    })

    return userAchievement
  }

  async countCatchesByUser(userId: string) {
    return prisma.catch.count({ where: { userId } })
  }

  async countDistinctSpeciesByUser(userId: string) {
    const rows = await prisma.catch.findMany({
      where: { userId },
      distinct: ['speciesId'],
      select: { speciesId: true },
    })

    return rows.length
  }

  async countLegendaryCatchesByUser(userId: string) {
    return prisma.catch.count({
      where: { userId, species: { difficulty: 'LEGENDARY' } },
    })
  }
}

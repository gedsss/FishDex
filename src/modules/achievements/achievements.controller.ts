import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  achievementParamsSchema,
  userAchievementsParamsSchema,
} from './achievements.schema'
import type { AchievementsService } from './achievements.service'

export class AchievementsController {
  constructor(private achievementsService: AchievementsService) {}

  async getAchievements(_request: FastifyRequest, reply: FastifyReply) {
    const achievement = await this.achievementsService.getAchievements()

    return reply.status(200).send(achievement)
  }

  async getAchievementsById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = achievementParamsSchema.parse(request.params)

    const achievement = await this.achievementsService.getAchievementById(id)

    return reply.status(200).send(achievement)
  }

  async getUserAchievements(request: FastifyRequest, reply: FastifyReply) {
    const { id } = userAchievementsParamsSchema.parse(request.params)

    const achievements = await this.achievementsService.getUnlockedByUser(id)

    return reply.status(200).send(achievements)
  }
}

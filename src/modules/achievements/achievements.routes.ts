import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/jwtMiddleware'
import { UserRepository } from '../users/users.repository'
import { AchievementsController } from './achievements.controller'
import { AchievementsRepository } from './achievements.repository'
import { AchievementsService } from './achievements.service'

const achievementsRepository = new AchievementsRepository()
const userRepository = new UserRepository()
const achievementsService = new AchievementsService(
  achievementsRepository,
  userRepository
)
const achievementsController = new AchievementsController(achievementsService)

export const achievementsRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/achievements', (request, reply) =>
    achievementsController.getAchievements(request, reply)
  )
  fastify.get('/achievements/:id', (request, reply) =>
    achievementsController.getAchievementsById(request, reply)
  )

  fastify.get(
    '/users/:id/achievements',
    { preHandler: authenticate },
    (request, reply) => achievementsController.getUserAchievements(request, reply)
  )
}

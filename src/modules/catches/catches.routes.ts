import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/jwtMiddleware'
import { AchievementsRepository } from '../achievements/achievements.repository'
import { AchievementsService } from '../achievements/achievements.service'
import { SpeciesRepository } from '../species/species.repository'
import { UserRepository } from '../users/users.repository'
import { CatchesController } from './catches.controller'
import { CatchesRepository } from './catches.repository'
import { CatchService } from './catches.service'

const catchesRepository = new CatchesRepository()
const speciesRepository = new SpeciesRepository()
const userRepository = new UserRepository()
const achievementsRepository = new AchievementsRepository()
const achievementsService = new AchievementsService(
  achievementsRepository,
  userRepository
)
const catchService = new CatchService(
  catchesRepository,
  speciesRepository,
  userRepository,
  achievementsService
)
const catchesController = new CatchesController(catchService)

export const catchesRoutes: FastifyPluginAsync = async fastify => {
  fastify.post('/', { preHandler: authenticate }, (request, reply) =>
    catchesController.create(request, reply)
  )
  fastify.get('/me', { preHandler: authenticate }, (request, reply) =>
    catchesController.findManyByUser(request, reply)
  )
  fastify.get('/:id', { preHandler: authenticate }, (request, reply) =>
    catchesController.findbyId(request, reply)
  )
}

import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/jwtMiddleware'
import { buildCatchesModule } from '../catches/catches.factory'
import { UserController } from './users.controller'
import { UserRepository } from './users.repository'
import { UserService } from './users.service'

const userRepository = new UserRepository()
const userService = new UserService(userRepository)
const userController = new UserController(userService)
const { catchesController } = buildCatchesModule()

export const usersRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/me', { preHandler: authenticate }, (request, reply) =>
    userController.findMe(request, reply)
  )
  fastify.get('/:id', { preHandler: authenticate }, (request, reply) =>
    userController.findUserById(request, reply)
  )
  fastify.get('/:id/catches', { preHandler: authenticate }, (request, reply) =>
    catchesController.findManyByUserParam(request, reply)
  )
}

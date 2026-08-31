import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/jwtMiddleware'
import { FriendshipController } from './friendships.controller'
import { FriendshipRepository } from './friendships.repository'
import { FriendshipService } from './friendships.service'

export const friendshipRoutes: FastifyPluginAsync = async fastify => {
  const repository = new FriendshipRepository()
  const service = new FriendshipService(repository)
  const controller = new FriendshipController(service)

  fastify.post('/', { preHandler: authenticate }, controller.sendRequest.bind(controller))
  fastify.patch<{ Params: { id: string } }>(
    '/:id/accept',
    { preHandler: authenticate },
    controller.accept.bind(controller)
  )
  fastify.patch<{ Params: { id: string } }>(
    '/:id/block',
    { preHandler: authenticate },
    controller.block.bind(controller)
  )
  fastify.get('/', { preHandler: authenticate }, controller.listFriendships.bind(controller))
}

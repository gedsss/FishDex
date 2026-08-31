import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/jwtMiddleware'
import { ReactionController } from './reactions.controller'

const controller = new ReactionController()

export const reactionRoutes: FastifyPluginAsync = async fastify => {
  fastify.put(
    '/:catchId/reaction',
    { preHandler: authenticate },
    (request, reply) => controller.react(request, reply)
  )

  fastify.delete(
    '/:catchId/reaction',
    { preHandler: authenticate },
    (request, reply) => controller.remove(request, reply)
  )
}

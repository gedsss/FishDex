import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/jwtMiddleware'
import { buildCatchesModule } from './catches.factory'

const { catchesController } = buildCatchesModule()

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

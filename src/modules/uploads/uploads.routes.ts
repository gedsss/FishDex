import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/jwtMiddleware'
import { UploadsController } from './uploads.controller'
import { UploadsRepository } from './uploads.repository'
import { UploadsService } from './uploads.service'

const uploadsRepository = new UploadsRepository()
const uploadsService = new UploadsService(uploadsRepository)
const uploadsController = new UploadsController(uploadsService)

// As fotos ficam no Postgres (tabela `media`, coluna bytea), não em disco.
export const uploadsRoutes: FastifyPluginAsync = async fastify => {
  fastify.post('/', { preHandler: authenticate }, (request, reply) =>
    uploadsController.upload(request, reply)
  )
  // Público: o app carrega a foto direto num <Image source={{ uri }} />, sem
  // header Authorization. O id é um UUID aleatório (não enumerável).
  fastify.get('/:id', (request, reply) =>
    uploadsController.getById(request, reply)
  )
}

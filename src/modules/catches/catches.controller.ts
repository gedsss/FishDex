import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  CreateCatchBodySchema,
  GetCatchByIdParamsSchema,
  GetMyCatchesQuerySchema,
  GetUserCatchesParamsSchema,
} from './catches.schema'
import type { CatchService } from './catches.service'

export class CatchesController {
  constructor(private catchesService: CatchService) {}
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = CreateCatchBodySchema.parse(request.body)
    const userId = (request.user as { sub: string }).sub

    const create = await this.catchesService.create({ ...data, userId })

    return reply.status(201).send(create)
  }

  async findbyId(request: FastifyRequest, reply: FastifyReply) {
    const { id } = GetCatchByIdParamsSchema.parse(request.params)
    const viewerId = (request.user as { sub: string }).sub

    const find = await this.catchesService.findById(id, viewerId)

    return reply.send(find)
  }

  async findManyByUser(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request.user as { sub: string }).sub
    const { page, limit } = GetMyCatchesQuerySchema.parse(request.query)

    const findMany = await this.catchesService.findManyByUser(userId, userId, {
      page,
      limit,
    })

    return reply.send(findMany)
  }

  // GET /users/:id/catches — capturas de outro usuário (galeria do perfil).
  async findManyByUserParam(request: FastifyRequest, reply: FastifyReply) {
    const { id } = GetUserCatchesParamsSchema.parse(request.params)
    const viewerId = (request.user as { sub: string }).sub

    const findMany = await this.catchesService.findManyByUser(id, viewerId, {
      page: 1,
      limit: 30,
    })

    return reply.send(findMany)
  }
}

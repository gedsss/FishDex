import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  CreateCatchBodySchema,
  GetCatchByIdParamsSchema,
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

    const find = await this.catchesService.findById(id)

    return find
  }

  async findManyByUser(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request.user as { sub: string }).sub

    const findMany = await this.catchesService.findManyByUser(userId)

    return findMany
  }
}

import type { FastifyReply, FastifyRequest } from 'fastify'
import { GetUserByIdParamsSchema } from './users.schema'
import type { UserService } from './users.service'

export class UserController {
  constructor(private userService: UserService) {}

  async findUserById(request: FastifyRequest, reply: FastifyReply) {
    const data = GetUserByIdParamsSchema.parse(request.params)

    const profile = await this.userService.getProfile(data.id)

    return reply.send(profile)
  }

  async findMe(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request.user as { sub: string }).sub

    const profile = await this.userService.getProfile(userId)

    return reply.send(profile)
  }
}

import type { FastifyReply, FastifyRequest } from 'fastify'
import { CatchesRepository } from '../catches/catches.repository'
import { ReactionsRepository } from './reactions.repository'
import { reactBodySchema, reactionParamsSchema } from './reactions.schema'
import { ReactionService } from './reactions.service'

export class ReactionController {
  private reactionService: ReactionService

  constructor() {
    const catchesRepository = new CatchesRepository()
    const reactionsRepository = new ReactionsRepository()
    this.reactionService = new ReactionService(
      reactionsRepository,
      catchesRepository
    )
  }

  async react(request: FastifyRequest, reply: FastifyReply) {
    const { catchId } = reactionParamsSchema.parse(request.params)
    const { emoji } = reactBodySchema.parse(request.body)
    const userId = (request.user as { sub: string }).sub

    const reaction = await this.reactionService.react(catchId, userId, emoji)

    return reply.status(200).send(reaction)
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const { catchId } = reactionParamsSchema.parse(request.params)
    const userId = (request.user as { sub: string }).sub

    await this.reactionService.remove(catchId, userId)

    return reply.status(204).send()
  }
}

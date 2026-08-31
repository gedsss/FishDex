import type { FastifyReply, FastifyRequest } from 'fastify'
import { GetFeedQuerySchema } from './feed.schema'
import type { FeedService } from './feed.service'

export class FeedController {
  constructor(private feedService: FeedService) {}

  async getFeed(request: FastifyRequest, reply: FastifyReply) {
    const { page, limit } = GetFeedQuerySchema.parse(request.query)
    const userId = (request.user as { sub: string }).sub

    const catches = await this.feedService.getFeed(userId, page, limit)

    return reply.send(catches)
  }
}

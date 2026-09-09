import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/jwtMiddleware'
import { CatchesRepository } from '../catches/catches.repository'
import { FriendshipRepository } from '../friendships/friendships.repository'
import { ReactionsRepository } from '../reactions/reactions.repository'
import { FeedController } from './feed.controller'
import { FeedRepository } from './feed.repository'
import { FeedService } from './feed.service'

const feedRepository = new FeedRepository()
const friendshipRepository = new FriendshipRepository()
const reactionsRepository = new ReactionsRepository()
const catchesRepository = new CatchesRepository()
const feedService = new FeedService(
  feedRepository,
  friendshipRepository,
  reactionsRepository,
  catchesRepository
)
const feedController = new FeedController(feedService)

export const feedRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/', { preHandler: authenticate }, (request, reply) =>
    feedController.getFeed(request, reply)
  )
}

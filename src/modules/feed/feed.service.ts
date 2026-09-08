import { FriendshipStatus } from '../../../generated/prisma/client'
import { toFeedCatches } from '../../shared/feed-catch'
import type { CatchesRepository } from '../catches/catches.repository'
import type { FriendshipRepository } from '../friendships/friendships.repository'
import type { ReactionsRepository } from '../reactions/reactions.repository'
import type { FeedRepository } from './feed.repository'

export class FeedService {
  constructor(
    private feedRepository: FeedRepository,
    private friendshipRepository: FriendshipRepository,
    private reactionsRepository: ReactionsRepository,
    private catchesRepository: CatchesRepository
  ) {}

  async getFeed(userId: string, page: number, limit: number) {
    const friendships = await this.friendshipRepository.findManyByUser(userId)

    const friendIds = friendships
      .filter(friendship => friendship.status === FriendshipStatus.ACCEPTED)
      .map(friendship =>
        friendship.userAId === userId ? friendship.userBId : friendship.userAId
      )

    if (friendIds.length === 0) {
      return []
    }

    const catches = await this.feedRepository.findCatchesByUserIds(
      friendIds,
      page,
      limit
    )

    return toFeedCatches(catches, userId, {
      reactionsRepository: this.reactionsRepository,
      catchesRepository: this.catchesRepository,
    })
  }
}

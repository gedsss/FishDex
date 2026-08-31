import { FriendshipStatus } from '../../../generated/prisma/client'
import type { FriendshipRepository } from '../friendships/friendships.repository'
import type { FeedRepository } from './feed.repository'

export class FeedService {
  constructor(
    private feedRepository: FeedRepository,
    private friendshipRepository: FriendshipRepository
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

    return catches
  }
}

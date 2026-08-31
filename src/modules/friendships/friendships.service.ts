import { FriendshipStatus } from '../../../generated/prisma/enums'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors'
import type { FriendshipRepository } from './friendships.repository'

export class FriendshipService {
  constructor(private friendshipRepository: FriendshipRepository) {}

  async sendRequest(requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) {
      throw new ConflictError('nao pode adicionar a si memso')
    }

    const existingFriendship = await this.friendshipRepository.findPair(
      requesterId,
      targetUserId
    )

    if (existingFriendship) {
      throw new ConflictError('amizade ja existe entre usuarios')
    }

    return this.friendshipRepository.createFriendship({
      senderId: requesterId,
      receiverId: targetUserId,
    })
  }

  async accept(friendshipId: string, callerUserId: string) {
    const friendship = await this.friendshipRepository.findById(friendshipId)

    if (!friendship) {
      throw new NotFoundError('amizade nao existe')
    }

    this.assertIsParticipant(friendship, callerUserId)

    if (friendship.requestedById === callerUserId) {
      throw new ForbiddenError('voce nao pode aceitar seu proprio pedido')
    }

    if (friendship.status !== 'PENDING') {
      throw new ConflictError('amizade nao pendente')
    }

    return this.friendshipRepository.updateStatus(
      friendshipId,
      FriendshipStatus.ACCEPTED
    )
  }

  async block(friendshipId: string, callerUserId: string) {
    const friendship = await this.friendshipRepository.findById(friendshipId)

    if (!friendship) {
      throw new NotFoundError('amizade nao existe')
    }

    this.assertIsParticipant(friendship, callerUserId)

    if (friendship.status === 'BLOCKED') {
      throw new ConflictError('esta amizade ja bloqueada')
    }

    return this.friendshipRepository.updateStatus(
      friendshipId,
      FriendshipStatus.BLOCKED
    )
  }

  async listFriendships(userId: string) {
    const all = await this.friendshipRepository.findManyByUser(userId)

    return {
      friends: all.filter(f => f.status === 'ACCEPTED'),
      pendingSent: all.filter(
        f => f.status === 'PENDING' && f.requestedById === userId
      ),
      pendingReceived: all.filter(
        f => f.status === 'PENDING' && f.requestedById !== userId
      ),
    }
  }

  private assertIsParticipant(
    friendship: { userAId: string; userBId: string },
    callerUserId: string
  ) {
    if (
      friendship.userAId !== callerUserId &&
      friendship.userBId !== callerUserId
    ) {
      throw new ForbiddenError('esta amizade nao existe')
    }
  }
}

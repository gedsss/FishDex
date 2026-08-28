import { FastifyRequest, FastifyReply } from "fastify";
import { FriendshipService } from "./friendships.service";
import { sendFriendRequest } from "./friendships.schema";
import { DomainError } from "../../shared/errors";

export class FriendshipController {
  constructor(private friendshipService: FriendshipService) {}

  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof DomainError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    return reply.status(400).send({ error: (error as Error).message });
  }

  async sendRequest(request: FastifyRequest, reply: FastifyReply) {
    try {
      const requesterId = (request.user as any).sub;
      const { targetUserId } = sendFriendRequest.parse(request.body);

      const friendship = await this.friendshipService.sendRequest(
        requesterId,
        targetUserId,
      );

      return reply.status(201).send(friendship);
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async accept(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const callerUserId = (request.user as any).sub;
      const { id: friendshipId } = request.params;

      const friendship = await this.friendshipService.accept(
        friendshipId,
        callerUserId,
      );

      return reply.status(200).send(friendship);
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async block(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const callerUserId = (request.user as any).sub;
      const { id: friendshipId } = request.params;

      const friendship = await this.friendshipService.block(
        friendshipId,
        callerUserId,
      );

      return reply.status(200).send(friendship);
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async listFriendships(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request.user as any).sub;
      const friendships = await this.friendshipService.listFriendships(userId);
      return reply.status(200).send(friendships);
    } catch (error) {
      return this.handleError(error, reply);
    }
  }
}
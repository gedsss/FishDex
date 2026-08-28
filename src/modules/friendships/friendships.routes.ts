import type { FastifyPluginAsync } from "fastify";
import { FriendshipRepository } from "./friendships.repository";
import { FriendshipService } from "./friendships.service";
import { FriendshipController } from "./friendships.controller";

export const friendshipRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new FriendshipRepository();
  const service = new FriendshipService(repository);
  const controller = new FriendshipController(service);

  fastify.post("/", controller.sendRequest.bind(controller));
  fastify.patch("/:id/accept", controller.accept.bind(controller));
  fastify.patch("/:id/block", controller.block.bind(controller));
  fastify.get("/", controller.listFriendships.bind(controller));
};

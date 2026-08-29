import { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../middlewares/jwtMiddleware";
import { FriendshipRepository } from "../friendships/friendships.repository";
import { FeedController } from "./feed.controller";
import { FeedRepository } from "./feed.repository";
import { FeedService } from "./feed.service";

const feedRepository = new FeedRepository();
const friendshipRepository = new FriendshipRepository();
const feedService = new FeedService(feedRepository, friendshipRepository);
const feedController = new FeedController(feedService);

export const feedRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get("/", { preHandler: authenticate }, (request, reply) => feedController.getFeed(request, reply));
};

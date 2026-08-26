import { FastifyPluginAsync } from "fastify";
import { UserRepository } from "./users.repository";
import { UserService } from "./users.service";
import { UserController } from "./users.controller";
import { authenticate } from "../../middlewares/jwtMiddleware";

const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const userController = new UserController(userService);

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get("/me", { preHandler: authenticate }, (request, reply) => userController.findMe(request, reply));
    fastify.get("/:id", { preHandler: authenticate }, (request, reply) => userController.findUserById(request, reply));
};

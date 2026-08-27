import { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../middlewares/jwtMiddleware";
import { SpeciesRepository } from "../species/species.repository";
import { UserRepository } from "../users/users.repository";
import { CatchesController } from "./catches.controller";
import { CatchesRepository } from "./catches.repository";
import { CatchService } from "./catches.service";

const catchesRepository = new CatchesRepository();
const speciesRepository = new SpeciesRepository();
const userRepository = new UserRepository();
const catchService = new CatchService(catchesRepository, speciesRepository, userRepository);
const catchesController = new CatchesController(catchService);

export const catchesRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post("/", { preHandler: authenticate }, (request, reply) => catchesController.create(request, reply));
    fastify.get("/me", { preHandler: authenticate }, (request, reply) => catchesController.findManyByUser(request, reply));
    fastify.get("/:id", { preHandler: authenticate }, (request, reply) => catchesController.findbyId(request, reply));
};

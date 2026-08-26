import { FastifyPluginAsync } from "fastify";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

export const authRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post("/register", (request, reply) => authController.registrar(request, reply));
    fastify.post("/login", (request, reply) => authController.login(request, reply));
};

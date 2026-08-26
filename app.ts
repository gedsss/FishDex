import "dotenv/config"
import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import { authRoutes } from './src/modules/auth/auth.routes'
import { usersRoutes } from './src/modules/users/users.routes'
import { speciesRoutes } from './src/modules/species/species.routes'

export const app = Fastify({ logger: true })

app.register(cors, { origin: true })
app.register(fastifyJwt, { secret: process.env.JWT_SECRET as string })


app.register(authRoutes, { prefix: '/auth' })
app.register(usersRoutes, { prefix: '/users' })
app.register(speciesRoutes, { prefix: '/species' })


app.get('/', (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ status: 200, message: 'Server Running' })
})
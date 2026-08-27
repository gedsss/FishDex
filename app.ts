import 'dotenv/config'
import cors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import sensible from '@fastify/sensible'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { errorHandler } from './src/middlewares/errorHandler'
import { authRoutes } from './src/modules/auth/auth.routes'
import { speciesRoutes } from './src/modules/species/species.routes'
import { usersRoutes } from './src/modules/users/users.routes'

export const app = Fastify({ logger: true })

app.register(cors, { origin: true })
app.register(fastifyJwt, { secret: process.env.JWT_SECRET as string })
app.register(sensible)
app.setErrorHandler(errorHandler)

app.register(authRoutes, { prefix: '/auth' })
app.register(usersRoutes, { prefix: '/users' })
app.register(speciesRoutes, { prefix: '/species' })

app.get('/', (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.send({ status: 200, message: 'Server Running' })
})

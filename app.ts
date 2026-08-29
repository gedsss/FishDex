import 'dotenv/config'
import cors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import sensible from '@fastify/sensible'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { errorHandler } from './src/middlewares/errorHandler'
import { authRoutes } from './src/modules/auth/auth.routes'
import { catchesRoutes } from './src/modules/catches/catches.routes'
import { speciesRoutes } from './src/modules/species/species.routes'
import { usersRoutes } from './src/modules/users/users.routes'
import { friendshipRoutes } from './src/modules/friendships/friendships.routes'
import { feedRoutes } from './src/modules/feed/feed.routes'

export const app = Fastify({ logger: true })

app.register(cors, { origin: true })
app.register(fastifyJwt, { secret: process.env.JWT_SECRET as string })
app.register(sensible)
app.setErrorHandler(errorHandler)

app.register(authRoutes, { prefix: '/auth' })
app.register(usersRoutes, { prefix: '/users' })
app.register(speciesRoutes, { prefix: '/species' })
app.register(catchesRoutes, { prefix: '/catches' })
app.register(friendshipRoutes, { prefix: '/friendships' })
app.register(feedRoutes, { prefix: '/feed' })

app.get('/', (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.send({ status: 200, message: 'Server Running' })
})

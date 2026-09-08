import 'dotenv/config'
import cors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import sensible from '@fastify/sensible'
import fastifyStatic from '@fastify/static'
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { errorHandler } from './src/middlewares/errorHandler'
import { achievementsRoutes } from './src/modules/achievements/achievements.routes'
import { authRoutes } from './src/modules/auth/auth.routes'
import { catchesRoutes } from './src/modules/catches/catches.routes'
import { feedRoutes } from './src/modules/feed/feed.routes'
import { friendshipRoutes } from './src/modules/friendships/friendships.routes'
import { reactionRoutes } from './src/modules/reactions/reactions.routes'
import { speciesRoutes } from './src/modules/species/species.routes'
import {
  MAX_UPLOAD_BYTES,
  UPLOADS_DIR,
} from './src/modules/uploads/uploads.constants'
import { uploadsRoutes } from './src/modules/uploads/uploads.routes'
import { usersRoutes } from './src/modules/users/users.routes'

export const app = Fastify({ logger: true })

// origin: true reflete a origem que chamou (Expo web em localhost:8081, etc.).
// O default do @fastify/cors só libera GET/HEAD/POST — precisamos de PUT/PATCH/
// DELETE (reações, amizades) e do header Authorization no preflight.
app.register(cors, {
  origin: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})
app.register(fastifyJwt, { secret: process.env.JWT_SECRET as string })
app.register(sensible)
app.register(multipart, {
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
})
// Fotos de captura enviadas via POST /uploads são servidas de volta aqui.
app.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: '/uploads/',
  index: false,
})
app.setErrorHandler(errorHandler)

app.register(authRoutes, { prefix: '/auth' })
app.register(usersRoutes, { prefix: '/users' })
app.register(speciesRoutes, { prefix: '/species' })
app.register(catchesRoutes, { prefix: '/catches' })
app.register(friendshipRoutes, { prefix: '/friendships' })
app.register(feedRoutes, { prefix: '/feed' })
app.register(achievementsRoutes)
app.register(reactionRoutes, { prefix: '/catches' })
app.register(uploadsRoutes, { prefix: '/uploads' })

app.get('/', (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.send({ status: 200, message: 'Server Running' })
})

import "dotenv/config"
import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import { authRoutes } from './src/modules/auth/auth.routes'

export const app = Fastify({ logger: true })

app.register(cors, { origin: true })
app.register(fastifyJwt, { secret: process.env.JWT_SECRET as string })


app.register(authRoutes, { prefix: '/auth' })


app.get('/', (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ status: 200, message: 'Server Running' })
})
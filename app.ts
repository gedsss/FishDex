import sensible from "@fastify/sensible";
import Fastify, { FastifyReply, FastifyRequest } from 'fastify'

const fastify = Fastify()

fastify.register(sensible)

fastify.get('/', (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ status: 200, message: 'Server Running' })
})
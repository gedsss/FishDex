import type { FastifyReply, FastifyRequest } from 'fastify'
import { LoginBodySchema, RegisterBodySchema } from './auth.schema'
import type { AuthService } from './auth.service'

export class AuthController {
  constructor(private authService: AuthService) {}

  async registrar(request: FastifyRequest, reply: FastifyReply) {
    const data = RegisterBodySchema.parse(request.body)

    const user = await this.authService.registrar(data)

    return reply.status(201).send(user)
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const data = LoginBodySchema.parse(request.body)

    const user = await this.authService.login(data)

    const token = await request.server.jwt.sign({ sub: user.id })

    return reply.send({ token, user })
  }
}

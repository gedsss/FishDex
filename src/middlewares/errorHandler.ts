import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { Prisma } from '../../generated/prisma/client'
import { DomainError } from '../shared/errors'

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof DomainError) {
    return reply.status(error.statusCode).send({ message: error.message })
  }

  if (error instanceof ZodError) {
    const message = error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')

    return reply.badRequest(message)
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    return reply.notFound(
      'A operação falhou porque depende de um ou mais recursos que não foram encontrados.'
    )
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    const fields = error.meta?.target
    const field = Array.isArray(fields) ? fields.join(', ') : fields
    return reply.conflict(`Já existe um recurso com esse valor para: ${field}.`)
  }

  request.log.error(error)
  return reply.send(error)
}

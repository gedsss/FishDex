import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { extname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/jwtMiddleware'
import { UPLOADS_DIR } from './uploads.constants'

const ALLOWED_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
}

export const uploadsRoutes: FastifyPluginAsync = async fastify => {
  // POST /uploads — envia a foto da captura (multipart, 1 arquivo).
  // Devolve { url: "/uploads/<uuid>.<ext>" } — servido estático pelo próprio
  // servidor (ver registro do @fastify/static em app.ts).
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    const file = await request.file()

    if (!file) {
      return reply.badRequest('Nenhum arquivo enviado (campo "file").')
    }

    if (!file.mimetype.startsWith('image/')) {
      return reply.badRequest('Só é permitido enviar imagens.')
    }

    const ext = ALLOWED_EXT[file.mimetype] ?? extname(file.filename) ?? '.jpg'
    const name = `${randomUUID()}${ext}`
    const target = join(UPLOADS_DIR, name)

    await pipeline(file.file, createWriteStream(target))

    if (file.file.truncated) {
      return reply.badRequest('Arquivo maior que o limite de 8 MB.')
    }

    return reply.status(201).send({ url: `/uploads/${name}` })
  })
}

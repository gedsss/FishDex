import type { FastifyReply, FastifyRequest } from 'fastify'
import { BadRequestError } from '../../shared/errors'
import { GetUploadParamsSchema } from './uploads.schema'
import type { UploadsService } from './uploads.service'

export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  // POST /uploads — multipart, campo "file", 1 arquivo de até 8 MB.
  async upload(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request.user as { sub: string }).sub
    const file = await request.file()

    if (!file) {
      throw new BadRequestError('Nenhum arquivo enviado (campo "file").')
    }

    let data: Buffer
    try {
      // toBuffer() lança se o arquivo passar do limite do @fastify/multipart,
      // então nada truncado chega a ser gravado.
      data = await file.toBuffer()
    } catch (error) {
      if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
        throw new BadRequestError('Arquivo maior que o limite de 8 MB.')
      }
      throw error
    }

    if (data.length === 0) {
      throw new BadRequestError('Arquivo vazio.')
    }

    const media = await this.uploadsService.saveImage(userId, data)

    return reply.status(201).send(media)
  }

  // GET /uploads/:id — devolve os bytes da imagem guardada no banco.
  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = GetUploadParamsSchema.parse(request.params)
    const media = await this.uploadsService.getImage(id)

    return reply
      .header('Content-Type', media.mimeType)
      .header('Content-Length', media.sizeBytes)
      .header('X-Content-Type-Options', 'nosniff')
      .header('Content-Security-Policy', "default-src 'none'")
      // O conteúdo de um id nunca muda, então pode ficar em cache para sempre.
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .send(Buffer.from(media.data))
  }
}

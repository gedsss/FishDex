import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors'
import { type AllowedMimeType, ORPHAN_MAX_AGE_MS } from './uploads.constants'
import type { UploadsRepository } from './uploads.repository'

// Brands ISO-BMFF (caixa "ftyp") usadas por HEIC/HEIF.
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis'])
const HEIF_BRANDS = new Set(['mif1', 'msf1'])

/**
 * Detecta o tipo da imagem pelos primeiros bytes do arquivo (magic bytes).
 * Devolve null para qualquer coisa fora da whitelist (SVG, GIF, PDF, texto…).
 */
export function detectImageMime(buf: Uint8Array): AllowedMimeType | null {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...buf.subarray(start, end))

  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return 'image/jpeg'

  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (buf.length >= 8 && PNG.every((b, i) => buf[i] === b)) return 'image/png'

  if (buf.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP')
    return 'image/webp'

  if (buf.length >= 12 && ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12)
    if (HEIC_BRANDS.has(brand)) return 'image/heic'
    if (HEIF_BRANDS.has(brand)) return 'image/heif'
  }

  return null
}

// URL devolvida por POST /uploads: "/uploads/<uuid>".
export const UPLOAD_URL_REGEX =
  /^\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

export class UploadsService {
  constructor(private uploadsRepository: UploadsRepository) {}

  async saveImage(userId: string, data: Buffer) {
    const mimeType = detectImageMime(data)

    if (!mimeType) {
      throw new BadRequestError(
        'Formato não suportado. Envie uma imagem JPEG, PNG, WebP ou HEIC.'
      )
    }

    const media = await this.uploadsRepository.create({
      userId,
      mimeType,
      sizeBytes: data.length,
      data: new Uint8Array(data),
    })

    return { ...media, url: `/uploads/${media.id}` }
  }

  async getImage(id: string) {
    const media = await this.uploadsRepository.findById(id)

    if (!media) {
      throw new NotFoundError('Imagem não encontrada')
    }

    return media
  }

  /**
   * Confere que `photoUrl` aponta para um upload que existe, é de `userId` e
   * ainda não está em outra captura. Devolve o id do upload (vira
   * `Catch.mediaId`).
   */
  async resolvePhotoForCatch(userId: string, photoUrl: string) {
    const match = UPLOAD_URL_REGEX.exec(photoUrl)

    if (!match) {
      throw new BadRequestError(
        'photoUrl deve ser a url devolvida por POST /uploads.'
      )
    }

    const media = await this.uploadsRepository.findOwnershipById(match[1])

    if (!media) {
      throw new BadRequestError('Foto não encontrada. Envie de novo.')
    }

    if (media.userId !== userId) {
      throw new ForbiddenError('Essa foto foi enviada por outro usuário.')
    }

    if (media.catch) {
      throw new ConflictError('Essa foto já está em outra captura.')
    }

    return media.id
  }

  /**
   * Apaga fotos que nunca foram vinculadas a uma captura e têm mais de
   * `maxAgeMs`. Devolve quantas foram apagadas.
   */
  async cleanupOrphans(maxAgeMs = ORPHAN_MAX_AGE_MS, now = new Date()) {
    const cutoff = new Date(now.getTime() - maxAgeMs)

    return this.uploadsRepository.deleteOrphansCreatedBefore(cutoff)
  }
}

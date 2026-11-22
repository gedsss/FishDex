import { prisma } from '../../../prisma/prisma.client'

export class UploadsRepository {
  async create(data: {
    userId: string
    mimeType: string
    sizeBytes: number
    data: Uint8Array<ArrayBuffer>
  }) {
    // Não devolve `data`: o upload só precisa do id para montar a URL.
    return prisma.media.create({
      data,
      select: { id: true, mimeType: true, sizeBytes: true, createdAt: true },
    })
  }

  async findById(id: string) {
    return prisma.media.findUnique({
      where: { id },
      select: { id: true, mimeType: true, sizeBytes: true, data: true },
    })
  }

  // Dono + captura vinculada, sem carregar os bytes da imagem.
  async findOwnershipById(id: string) {
    return prisma.media.findUnique({
      where: { id },
      select: { id: true, userId: true, catch: { select: { id: true } } },
    })
  }

  // Apaga fotos sem captura vinculada enviadas antes de `cutoff`.
  async deleteOrphansCreatedBefore(cutoff: Date) {
    const { count } = await prisma.media.deleteMany({
      where: { catch: null, createdAt: { lt: cutoff } },
    })

    return count
  }
}

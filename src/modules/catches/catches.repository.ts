import { prisma } from '../../../prisma/prisma.client'

// Autor embutido nas capturas do feed / listagens — nunca inclui passwordHash.
const authorSelect = {
  select: { id: true, username: true, level: true, avatarUrl: true },
} as const

export class CatchesRepository {
  async create(data: {
    userId: string
    speciesId: string
    photoUrl: string
    xpAwarded: number
    capturedAt: Date
    weightGrams?: number
    lengthCm?: number
    locationLat?: number
    locationLng?: number
    locationName?: string
  }) {
    const newCatch = await prisma.catch.create({
      data: {
        userId: data.userId,
        speciesId: data.speciesId,
        photoUrl: data.photoUrl,
        xpAwarded: data.xpAwarded,
        capturedAt: data.capturedAt,
        weightGrams: data.weightGrams,
        lengthCm: data.lengthCm,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        locationName: data.locationName,
      },
    })

    return newCatch
  }

  async findById(id: string) {
    const foundCatch = await prisma.catch.findUnique({
      where: { id },
      include: { user: authorSelect },
    })

    return foundCatch
  }

  async findManyByUser(
    userId: string,
    pagination?: { page?: number; limit?: number }
  ) {
    const take = pagination?.limit
    const skip =
      pagination?.page && pagination.limit
        ? (pagination.page - 1) * pagination.limit
        : undefined

    const catches = await prisma.catch.findMany({
      where: { userId },
      orderBy: { capturedAt: 'desc' },
      include: { user: authorSelect },
      ...(take ? { take } : {}),
      ...(skip ? { skip } : {}),
    })

    return catches
  }

  // Data da primeira captura de cada par (usuário, espécie) — usada para marcar
  // "nova espécie" no feed sem uma query por captura.
  async earliestCaptureByUserSpecies(userIds: string[]) {
    if (userIds.length === 0) return []

    return prisma.catch.groupBy({
      by: ['userId', 'speciesId'],
      where: { userId: { in: userIds } },
      _min: { capturedAt: true },
    })
  }
}

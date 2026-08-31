import { prisma } from '../../../prisma/prisma.client'

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
    })

    return foundCatch
  }

  async findManyByUser(userId: string) {
    const catches = await prisma.catch.findMany({
      where: { userId },
      orderBy: { capturedAt: 'desc' },
    })

    return catches
  }
}

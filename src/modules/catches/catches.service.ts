import { NotFoundError } from '../../shared/errors'
import { type FeedCatchDTO, toFeedCatches } from '../../shared/feed-catch'
import type { AchievementsService } from '../achievements/achievements.service'
import type { ReactionsRepository } from '../reactions/reactions.repository'
import type { SpeciesRepository } from '../species/species.repository'
import type { UploadsService } from '../uploads/uploads.service'
import type { UserRepository } from '../users/users.repository'
import type { CatchesRepository } from './catches.repository'
import { calculateLevel } from './level'

export class CatchService {
  constructor(
    private catchRepository: CatchesRepository,
    private speciesRepository: SpeciesRepository,
    private userRepository: UserRepository,
    private achievementsService: AchievementsService,
    private reactionsRepository: ReactionsRepository,
    private uploadsService: UploadsService
  ) {}
  async create(data: {
    userId: string
    speciesId: string
    photoUrl: string
    capturedAt: Date
    weightGrams?: number
    lengthCm?: number
    locationLat?: number
    locationLng?: number
    locationName?: string
  }) {
    const species = await this.speciesRepository.getSpeciesById(data.speciesId)

    if (!species) {
      throw new NotFoundError('Especie nao encontrada')
    }

    const mediaId = await this.uploadsService.resolvePhotoForCatch(
      data.userId,
      data.photoUrl
    )

    const xpAwarded = species.baseXp

    // mediaId é @unique: se duas capturas tentarem a mesma foto ao mesmo
    // tempo, a segunda cai no P2002 → 409 (errorHandler) antes de dar XP.
    const newCatch = await this.catchRepository.create({
      ...data,
      mediaId,
      xpAwarded,
    })

    const user = await this.userRepository.findById(data.userId)

    if (!user) {
      throw new NotFoundError('Usuario nao encontrado')
    }

    const newXp = user.xp + xpAwarded
    const newLevel = calculateLevel(newXp)

    await this.userRepository.updateXpAndLevel(data.userId, newXp, newLevel)

    await this.achievementsService.checkAchievements(data.userId, {
      difficulty: species.difficulty,
    })

    return newCatch
  }

  async findById(id: string, viewerId: string): Promise<FeedCatchDTO> {
    const catchById = await this.catchRepository.findById(id)

    if (!catchById) {
      throw new NotFoundError('Captura nao encontrada')
    }

    const [enriched] = await toFeedCatches([catchById], viewerId, {
      reactionsRepository: this.reactionsRepository,
      catchesRepository: this.catchRepository,
    })

    return enriched
  }

  async findManyByUser(
    userId: string,
    viewerId: string,
    pagination?: { page?: number; limit?: number }
  ): Promise<FeedCatchDTO[]> {
    const catches = await this.catchRepository.findManyByUser(userId, pagination)

    return toFeedCatches(catches, viewerId, {
      reactionsRepository: this.reactionsRepository,
      catchesRepository: this.catchRepository,
    })
  }
}

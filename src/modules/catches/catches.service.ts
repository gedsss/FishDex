import { NotFoundError } from '../../shared/errors'
import type { AchievementsService } from '../achievements/achievements.service'
import type { SpeciesRepository } from '../species/species.repository'
import type { UserRepository } from '../users/users.repository'
import type { CatchesRepository } from './catches.repository'
import { calculateLevel } from './level'

export class CatchService {
  constructor(
    private catchRepository: CatchesRepository,
    private speciesRepository: SpeciesRepository,
    private userRepository: UserRepository,
    private achievementsService: AchievementsService
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

    const xpAwarded = species.baseXp

    const newCatch = await this.catchRepository.create({
      ...data,
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

  async findById(id: string) {
    const catchById = await this.catchRepository.findById(id)

    return catchById
  }

  async findManyByUser(userId: string) {
    const catchesByUserId = await this.catchRepository.findManyByUser(userId)

    return catchesByUserId
  }
}

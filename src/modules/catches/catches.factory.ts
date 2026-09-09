import { AchievementsRepository } from '../achievements/achievements.repository'
import { AchievementsService } from '../achievements/achievements.service'
import { ReactionsRepository } from '../reactions/reactions.repository'
import { SpeciesRepository } from '../species/species.repository'
import { UserRepository } from '../users/users.repository'
import { CatchesController } from './catches.controller'
import { CatchesRepository } from './catches.repository'
import { CatchService } from './catches.service'

// Monta a cadeia de dependências do módulo de capturas. Usado tanto pelas rotas
// de /catches quanto pela rota GET /users/:id/catches (galeria do perfil).
export function buildCatchesModule() {
  const catchesRepository = new CatchesRepository()
  const speciesRepository = new SpeciesRepository()
  const userRepository = new UserRepository()
  const reactionsRepository = new ReactionsRepository()
  const achievementsRepository = new AchievementsRepository()
  const achievementsService = new AchievementsService(
    achievementsRepository,
    userRepository
  )
  const catchService = new CatchService(
    catchesRepository,
    speciesRepository,
    userRepository,
    achievementsService,
    reactionsRepository
  )
  const catchesController = new CatchesController(catchService)

  return { catchService, catchesController }
}

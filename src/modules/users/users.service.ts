import type { UserRepository } from './users.repository'

export class UserService {
  constructor(private userRepository: UserRepository) {}
  async findUserById(id: string) {
    const user = await this.userRepository.findById(id)

    if (!user) {
      throw new Error('Usuario nao encontrado. ')
    }

    return user
  }

  async countCatchesBySpecies(id: string) {
    const species = await this.userRepository.countCatchesBySpecies(id)

    return species
  }

  async getProfile(id: string) {
    const user = await this.findUserById(id)
    const catchesBySpecies = await this.countCatchesBySpecies(id)

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      level: user.level,
      xp: user.xp,
      catchesBySpecies,
    }
  }
}

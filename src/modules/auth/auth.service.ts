import bcrypt from 'bcrypt'
import type { AuthRepository } from './auth.repository'

export class AuthService {
  constructor(private authRepository: AuthRepository) {}

  async registrar(data: { username: string; email: string; password: string }) {
    const usuarioExiste = await this.authRepository.findByEmail(data.email)

    if (usuarioExiste) {
      throw new Error('Email ja existe ')
    }

    const senhaHash = await bcrypt.hash(data.password, 10)

    const user = await this.authRepository.create({
      username: data.username,
      email: data.email,
      passwordHash: senhaHash,
    })

    return {
      id: user.id,
      email: user.email,
      username: user.username,
    }
  }

  async login(data: { email: string; password: string }) {
    const user = await this.authRepository.findByEmail(data.email)
    if (!user) {
      throw new Error('Email ou senha nao encontrados. ')
    }

    const senhaCorreta = await bcrypt.compare(data.password, user.passwordHash)

    if (!senhaCorreta) {
      throw new Error('Email ou senha nao encontrados. ')
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    }
  }
}

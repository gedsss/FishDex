import { prisma } from '../../../prisma/prisma.client'

export class AuthRepository {
  async findByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    return user
  }

  async findByUsername(username: string) {
    const user = await prisma.user.findUnique({
      where: { username },
    })

    return user
  }

  async create(data: {
    username: string
    email: string
    passwordHash: string
  }) {
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash: data.passwordHash,
      },
    })

    return user
  }

  async deleteUser(id: string) {
    return await prisma.user.delete({
      where: { id },
    })
  }
}

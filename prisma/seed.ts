import 'dotenv/config'
import { ACHIEVEMENT_CATALOG } from '../src/modules/achievements/achievements.constants'
import { prisma } from './prisma.client'

async function main() {
  for (const achievement of ACHIEVEMENT_CATALOG) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: {
        name: achievement.name,
        description: achievement.description,
      },
      create: achievement,
    })
  }

  console.log(`Seed: ${ACHIEVEMENT_CATALOG.length} achievement(s) catalogado(s).`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

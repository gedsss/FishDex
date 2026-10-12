import 'dotenv/config'
import bcrypt from 'bcrypt'
import { ACHIEVEMENT_CATALOG } from '../src/modules/achievements/achievements.constants'
import { calculateLevel } from '../src/modules/catches/level'
import { SPECIES } from './data/species'
import { prisma } from './prisma.client'

// ---------------------------------------------------------------------------
// Usuários demo + amizades + capturas — para o app abrir já com conteúdo
// (feed, perfil de amigo, coleção) sem cadastro manual.
// ---------------------------------------------------------------------------

const DEMO_PASSWORD = 'pescaria123'

const USERS = [
  { key: 'gedson', username: 'Gedson Silva', email: 'gedson@fishdex.app' },
  { key: 'marina', username: 'Marina Duarte', email: 'marina@fishdex.app' },
  { key: 'caio', username: 'Caio Rezende', email: 'caio@fishdex.app' },
]

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3_600_000)
}
function daysAgo(d: number) {
  return new Date(Date.now() - d * 86_400_000)
}

interface CatchSeed {
  id: string
  userKey: string
  speciesName: string
  capturedAt: Date
  locationName: string
  weightGrams: number | null
  lengthCm: number | null
}

// IDs fixos (UUID) para o seed ser idempotente e para o app poder abrir o
// detalhe / reagir a estas capturas (as rotas validam `z.uuid()`).
const CATCHES: CatchSeed[] = [
  // Gedson (usuário principal do login demo)
  { id: '518a80f4-ae7a-4301-a19f-96a5de747b1d', userKey: 'gedson', speciesName: 'Traíra', capturedAt: daysAgo(1), locationName: 'Represa de Guarapiranga', weightGrams: 1400, lengthCm: 42 },
  { id: '29714e9d-f4e5-42df-bfc8-e044bcd72b52', userKey: 'gedson', speciesName: 'Lambari', capturedAt: daysAgo(6), locationName: 'Represa de Guarapiranga', weightGrams: 40, lengthCm: 11 },
  { id: 'ca1de2f6-37eb-4a77-b42c-755587bb9ac3', userKey: 'gedson', speciesName: 'Tambaqui', capturedAt: daysAgo(12), locationName: 'Rio Solimões — AM', weightGrams: 6200, lengthCm: 61 },
  { id: '83405d41-10b9-40e0-9afd-8b616d46755f', userKey: 'gedson', speciesName: 'Pacu', capturedAt: daysAgo(20), locationName: 'Pesqueiro Maeda — SP', weightGrams: 3100, lengthCm: 47 },
  { id: '5d472d8f-5017-4770-a83b-1ae50fd6bb6a', userKey: 'gedson', speciesName: 'Tucunaré-açu', capturedAt: daysAgo(35), locationName: 'Rio Negro — Barcelos', weightGrams: 4800, lengthCm: 68 },

  // Marina (amiga — enche o feed do Gedson)
  { id: '1887d4ee-0136-44ac-913d-60eaabf099a9', userKey: 'marina', speciesName: 'Pirarucu', capturedAt: hoursAgo(3), locationName: 'Mamirauá — AM', weightGrams: 18400, lengthCm: 148 },
  { id: '73e3cccb-43d3-4ae8-99be-9ebaaae488ef', userKey: 'marina', speciesName: 'Anchova', capturedAt: daysAgo(4), locationName: 'Praia do Cassino — RS', weightGrams: 4200, lengthCm: 71 },
  { id: 'e96afdfe-748b-4915-81b8-8fe7290d46b5', userKey: 'marina', speciesName: 'Tucunaré-açu', capturedAt: daysAgo(9), locationName: 'Lago de Tucuruí — PA', weightGrams: 2100, lengthCm: 49 },

  // Caio (amigo)
  { id: 'ad817f3e-5746-4c17-b9d2-46549608b0b7', userKey: 'caio', speciesName: 'Tambaqui', capturedAt: daysAgo(2), locationName: 'Rio Solimões — AM', weightGrams: 6200, lengthCm: 61 },
  { id: '1c5fc483-52e0-4718-b84e-305ca45774d5', userKey: 'caio', speciesName: 'Dourado', capturedAt: daysAgo(5), locationName: 'Rio Paraná — Porto Rico', weightGrams: 7600, lengthCm: 79 },
  { id: '5c603ea7-c50f-4628-987b-997b8a8edbbb', userKey: 'caio', speciesName: 'Pacu', capturedAt: daysAgo(13), locationName: 'Pesqueiro Maeda — SP', weightGrams: 2800, lengthCm: 44 },
]

type ReactionEmoji = 'LIKE' | 'LOVE' | 'FIRE' | 'WOW' | 'CLAP' | 'BIG_ONE'

// Reações demo entre os amigos (catchId por UUID acima, userKey de quem reagiu).
const REACTIONS: { catchId: string; userKey: string; emoji: ReactionEmoji }[] = [
  { catchId: '1887d4ee-0136-44ac-913d-60eaabf099a9', userKey: 'gedson', emoji: 'FIRE' }, // pirarucu da marina
  { catchId: '1887d4ee-0136-44ac-913d-60eaabf099a9', userKey: 'caio', emoji: 'BIG_ONE' },
  { catchId: '73e3cccb-43d3-4ae8-99be-9ebaaae488ef', userKey: 'gedson', emoji: 'CLAP' }, // anchova da marina
  { catchId: 'ad817f3e-5746-4c17-b9d2-46549608b0b7', userKey: 'gedson', emoji: 'LIKE' }, // tambaqui do caio
  { catchId: '1c5fc483-52e0-4718-b84e-305ca45774d5', userKey: 'marina', emoji: 'FIRE' }, // dourado do caio
  { catchId: '518a80f4-ae7a-4301-a19f-96a5de747b1d', userKey: 'marina', emoji: 'LOVE' }, // traíra do gedson
  { catchId: '518a80f4-ae7a-4301-a19f-96a5de747b1d', userKey: 'caio', emoji: 'WOW' },
]

function sortPair(a: string, b: string) {
  return a.localeCompare(b) <= 0
    ? { userAId: a, userBId: b }
    : { userAId: b, userBId: a }
}

async function main() {
  // --- Espécies ---
  const speciesIdByName = new Map<string, string>()
  for (let i = 0; i < SPECIES.length; i++) {
    const s = SPECIES[i]
    const regions = s.regions.map(region => ({
      name: region.name,
      season: region.season,
    }))
    const mapPins = s.regions.map((region, index) => ({
      x: region.place.x,
      y: region.place.y,
      label: String(index + 1),
    }))
    const data = {
      scientificName: s.scientificName,
      family: s.family,
      difficulty: s.difficulty,
      baseXp: s.baseXp,
      description: s.description,
      referenceImageUrl: `/illustrations/${s.illustration}.svg`,
      dexOrder: i + 1,
      habitat: s.habitat,
      averageSizeCm: s.averageSizeCm,
      diet: s.diet,
      baits: s.baits,
      regions,
      mapPins,
      tone: s.tone,
      bestTime: s.bestTime,
      techniques: s.techniques,
      closedSeasons: s.closedSeasons,
      tipsReviewed: s.tipsReviewed ?? false,
    }
    const record = await prisma.species.upsert({
      where: { name: s.name },
      update: data,
      create: { name: s.name, ...data },
    })
    speciesIdByName.set(s.name, record.id)
  }

  // --- Conquistas ---
  for (const achievement of ACHIEVEMENT_CATALOG) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: { name: achievement.name, description: achievement.description },
      create: achievement,
    })
  }

  // --- Usuários demo ---
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const userIdByKey = new Map<string, string>()
  for (const u of USERS) {
    const record = await prisma.user.upsert({
      where: { email: u.email },
      update: { username: u.username },
      create: { username: u.username, email: u.email, passwordHash },
    })
    userIdByKey.set(u.key, record.id)
  }

  // --- Amizades (Gedson <-> Marina, Gedson <-> Caio) ---
  const gedson = userIdByKey.get('gedson') as string
  for (const otherKey of ['marina', 'caio']) {
    const other = userIdByKey.get(otherKey) as string
    const pair = sortPair(gedson, other)
    await prisma.friendship.upsert({
      where: { userAId_userBId: { userAId: pair.userAId, userBId: pair.userBId } },
      update: { status: 'ACCEPTED', respondedAt: new Date() },
      create: {
        userAId: pair.userAId,
        userBId: pair.userBId,
        requestedById: other,
        status: 'ACCEPTED',
        respondedAt: new Date(),
      },
    })
  }

  // --- Capturas demo ---
  for (const c of CATCHES) {
    const userId = userIdByKey.get(c.userKey) as string
    const speciesId = speciesIdByName.get(c.speciesName) as string
    const baseXp = SPECIES.find(s => s.name === c.speciesName)?.baseXp ?? 0
    await prisma.catch.upsert({
      where: { id: c.id },
      update: {
        speciesId,
        xpAwarded: baseXp,
        capturedAt: c.capturedAt,
        locationName: c.locationName,
        weightGrams: c.weightGrams,
        lengthCm: c.lengthCm,
      },
      create: {
        id: c.id,
        userId,
        speciesId,
        photoUrl: '',
        xpAwarded: baseXp,
        capturedAt: c.capturedAt,
        locationName: c.locationName,
        weightGrams: c.weightGrams,
        lengthCm: c.lengthCm,
      },
    })
  }

  // --- Reações demo ---
  for (const r of REACTIONS) {
    const userId = userIdByKey.get(r.userKey) as string
    await prisma.reaction.upsert({
      where: { catchId_userId: { catchId: r.catchId, userId } },
      update: { emoji: r.emoji },
      create: { catchId: r.catchId, userId, emoji: r.emoji },
    })
  }

  // --- Espécies que saíram do catálogo ---
  const catalogNames = SPECIES.map(s => s.name)
  await prisma.species.deleteMany({
    where: { name: { notIn: catalogNames }, catches: { none: {} } },
  })
  const leftovers = await prisma.species.findMany({
    where: { name: { notIn: catalogNames } },
    select: { name: true },
  })
  for (const species of leftovers) {
    console.warn(
      `Aviso: "${species.name}" saiu do catálogo, mas tem capturas e não foi apagada.`
    )
  }

  // --- Recalcular XP/nível e destravar FIRST_CATCH para quem tem captura ---
  const firstCatch = await prisma.achievement.findUnique({
    where: { code: 'FIRST_CATCH' },
  })
  for (const userId of userIdByKey.values()) {
    const agg = await prisma.catch.aggregate({
      where: { userId },
      _sum: { xpAwarded: true },
      _count: true,
    })
    const xp = agg._sum.xpAwarded ?? 0
    await prisma.user.update({
      where: { id: userId },
      data: { xp, level: calculateLevel(xp) },
    })
    if (agg._count > 0 && firstCatch) {
      await prisma.userAchievement.upsert({
        where: {
          userId_achievementId: { userId, achievementId: firstCatch.id },
        },
        update: {},
        create: { userId, achievementId: firstCatch.id },
      })
    }
  }

  console.log(
    `Seed: ${SPECIES.length} espécies, ${ACHIEVEMENT_CATALOG.length} conquistas, ${USERS.length} usuários demo, ${CATCHES.length} capturas, ${REACTIONS.length} reações.`
  )
  console.log(`Login demo: gedson@fishdex.app / ${DEMO_PASSWORD}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import 'dotenv/config'
import bcrypt from 'bcrypt'
import { ACHIEVEMENT_CATALOG } from '../src/modules/achievements/achievements.constants'
import { calculateLevel } from '../src/modules/catches/level'
import { prisma } from './prisma.client'

// ---------------------------------------------------------------------------
// Catálogo de espécies — portado do protótipo (mobile/src/api/mock/data.ts).
// ---------------------------------------------------------------------------

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EPIC' | 'LEGENDARY'

interface SpeciesSeed {
  name: string
  scientificName: string
  family: string
  difficulty: Difficulty
  baseXp: number
  habitat: 'Doce' | 'Salgada'
  averageSizeCm: number
  diet: string
  tone: [string, string]
  description: string
  baits: string[]
  regions: { name: string; season: string }[]
  mapPins: { x: string; y: string; label: string }[]
}

const SPECIES: SpeciesSeed[] = [
  {
    name: 'Traíra',
    scientificName: 'Hoplias malabaricus',
    family: 'Erythrinidae',
    difficulty: 'EASY',
    baseXp: 15,
    habitat: 'Doce',
    averageSizeCm: 50,
    diet: 'Carnívoro',
    tone: ['#22453c', '#1b3931'],
    description:
      'Predadora de emboscada comum em açudes e brejos. Ataca iscas de superfície ao amanhecer e no fim da tarde.',
    baits: ['Isca de superfície', 'Minhoca', 'Peixe vivo'],
    regions: [
      { name: 'Açudes do Nordeste', season: 'ano todo' },
      { name: 'Vale do Ribeira', season: 'set–mar' },
    ],
    mapPins: [
      { x: '58%', y: '38%', label: 'NE' },
      { x: '48%', y: '68%', label: 'SP' },
    ],
  },
  {
    name: 'Betta',
    scientificName: 'Betta splendens',
    family: 'Osphronemidae',
    difficulty: 'EASY',
    baseXp: 10,
    habitat: 'Doce',
    averageSizeCm: 7,
    diet: 'Insetívoro',
    tone: ['#42264d', '#341e3d'],
    description:
      'Peixe de aquário originário de arrozais da Tailândia. Respira ar atmosférico pelo labirinto — dispensa aeração forte.',
    baits: ['Larva de mosquito', 'Ração em flocos'],
    regions: [{ name: 'Bacia do Mekong', season: 'aquarismo' }],
    mapPins: [{ x: '66%', y: '42%', label: 'Mekong' }],
  },
  {
    name: 'Tambaqui',
    scientificName: 'Colossoma macropomum',
    family: 'Serrasalmidae',
    difficulty: 'MEDIUM',
    baseXp: 35,
    habitat: 'Doce',
    averageSizeCm: 90,
    diet: 'Onívoro',
    tone: ['#1c3f47', '#16333b'],
    description:
      'Come frutos e sementes na várzea amazônica. Boca forte: exige anzol robusto e linha resistente à abrasão.',
    baits: ['Fruto de açaí', 'Massa de milho', 'Ração'],
    regions: [
      { name: 'Bacia Amazônica', season: 'nov–abr' },
      { name: 'Pantanal', season: 'mai–ago' },
    ],
    mapPins: [
      { x: '38%', y: '32%', label: 'AM' },
      { x: '46%', y: '58%', label: 'MS' },
    ],
  },
  {
    name: 'Peixe-palhaço',
    scientificName: 'Amphiprion ocellaris',
    family: 'Pomacentridae',
    difficulty: 'MEDIUM',
    baseXp: 30,
    habitat: 'Salgada',
    averageSizeCm: 9,
    diet: 'Onívoro',
    tone: ['#6d3c1d', '#5a3118'],
    description:
      'Vive em simbiose com anêmonas de recife. Em aquário marinho, precisa de rocha viva e parâmetros estáveis.',
    baits: ['Artêmia', 'Ração marinha'],
    regions: [
      { name: 'Indo-Pacífico', season: 'ano todo' },
      { name: 'Grande Barreira', season: 'ano todo' },
    ],
    mapPins: [
      { x: '70%', y: '46%', label: 'Indo-Pac.' },
      { x: '78%', y: '66%', label: 'AU' },
    ],
  },
  {
    name: 'Pacu',
    scientificName: 'Piaractus mesopotamicus',
    family: 'Serrasalmidae',
    difficulty: 'MEDIUM',
    baseXp: 30,
    habitat: 'Doce',
    averageSizeCm: 60,
    diet: 'Onívoro',
    tone: ['#2f4522', '#26381c'],
    description:
      'Muito comum em pesqueiros do Sudeste. Briga forte em água rasa e aceita iscas vegetais.',
    baits: ['Massa de trigo', 'Milho verde', 'Coração de galinha'],
    regions: [
      { name: 'Bacia do Paraná', season: 'out–mar' },
      { name: 'Pantanal', season: 'ano todo' },
    ],
    mapPins: [
      { x: '44%', y: '60%', label: 'PR' },
      { x: '40%', y: '52%', label: 'MS' },
    ],
  },
  {
    name: 'Tucunaré-açu',
    scientificName: 'Cichla temensis',
    family: 'Cichlidae',
    difficulty: 'HARD',
    baseXp: 45,
    habitat: 'Doce',
    averageSizeCm: 70,
    diet: 'Carnívoro',
    tone: ['#134539', '#0e392f'],
    description:
      'O ciclídeo mais cobiçado do Brasil. Ataque explosivo em iscas de superfície perto de galhadas e pedrais.',
    baits: ['Zara / isca de hélice', 'Jig 3/8 oz', 'Lambari vivo'],
    regions: [
      { name: 'Rio Negro (AM)', season: 'set–fev' },
      { name: 'Lago de Tucuruí', season: 'jun–nov' },
      { name: 'Represas do Sudeste', season: 'out–mar' },
    ],
    mapPins: [
      { x: '34%', y: '30%', label: 'Rio Negro' },
      { x: '52%', y: '34%', label: 'Tucuruí' },
      { x: '50%', y: '62%', label: 'SE' },
    ],
  },
  {
    name: 'Robalo-flecha',
    scientificName: 'Centropomus undecimalis',
    family: 'Centropomidae',
    difficulty: 'HARD',
    baseXp: 55,
    habitat: 'Salgada',
    averageSizeCm: 90,
    diet: 'Carnívoro',
    tone: ['#1b3f54', '#153446'],
    description:
      'Vive em estuários, manguezais e barras de rio. Sensível a barulho — aproximação silenciosa é decisiva.',
    baits: ['Camarão vivo', 'Shad 4"', 'Bailarina'],
    regions: [
      { name: 'Litoral SE/S', season: 'set–abr' },
      { name: 'Baía de Paranaguá', season: 'nov–mar' },
    ],
    mapPins: [
      { x: '56%', y: '58%', label: 'Litoral SE' },
      { x: '52%', y: '72%', label: 'PR' },
    ],
  },
  {
    name: 'Anchova',
    scientificName: 'Pomatomus saltatrix',
    family: 'Pomatomidae',
    difficulty: 'HARD',
    baseXp: 50,
    habitat: 'Salgada',
    averageSizeCm: 70,
    diet: 'Carnívoro',
    tone: ['#1c3141', '#162836'],
    description:
      'Caça em cardumes na arrebentação durante o inverno. Dentição afiada exige encastoamento de aço.',
    baits: ['Sardinha inteira', 'Jig metálico', 'Isca de arrasto'],
    regions: [
      { name: 'Praias do Sul', season: 'mai–ago' },
      { name: 'Cabo Frio', season: 'jun–set' },
    ],
    mapPins: [
      { x: '50%', y: '74%', label: 'Sul' },
      { x: '58%', y: '56%', label: 'RJ' },
    ],
  },
  {
    name: 'Garoupa',
    scientificName: 'Epinephelus marginatus',
    family: 'Serranidae',
    difficulty: 'EPIC',
    baseXp: 65,
    habitat: 'Salgada',
    averageSizeCm: 100,
    diet: 'Carnívoro',
    tone: ['#3e3120', '#32281a'],
    description:
      'Territorial, vive em lajes e naufrágios profundos. Recolhimento imediato evita que ela se enfie na pedra.',
    baits: ['Lula', 'Peixe cortado', 'Jig de fundo'],
    regions: [
      { name: 'Lajes de SP/RJ', season: 'ano todo' },
      { name: 'Abrolhos', season: 'set–mar' },
    ],
    mapPins: [
      { x: '56%', y: '58%', label: 'SP/RJ' },
      { x: '62%', y: '48%', label: 'BA' },
    ],
  },
  {
    name: 'Dourado',
    scientificName: 'Salminus brasiliensis',
    family: 'Bryconidae',
    difficulty: 'EPIC',
    baseXp: 70,
    habitat: 'Doce',
    averageSizeCm: 80,
    diet: 'Carnívoro',
    tone: ['#5b4614', '#4a3a11'],
    description:
      'O "tigre dos rios": saltos e corridas longas. Sobe corredeiras na piracema em busca de cardumes.',
    baits: ['Isca artificial de meia-água', 'Tuvira', 'Colher giratória'],
    regions: [
      { name: 'Rio Paraná', season: 'set–nov' },
      { name: 'Rio Paraguai', season: 'ago–out' },
    ],
    mapPins: [
      { x: '44%', y: '64%', label: 'Paraná' },
      { x: '40%', y: '56%', label: 'Paraguai' },
    ],
  },
  {
    name: 'Pirarucu',
    scientificName: 'Arapaima gigas',
    family: 'Arapaimidae',
    difficulty: 'LEGENDARY',
    baseXp: 120,
    habitat: 'Doce',
    averageSizeCm: 200,
    diet: 'Carnívoro',
    tone: ['#471f26', '#39191f'],
    description:
      'Gigante amazônico que sobe à superfície para respirar. Pesca permitida só em áreas de manejo comunitário.',
    baits: ['Peixe vivo grande', 'Isca de superfície XL'],
    regions: [
      { name: 'Mamirauá (AM)', season: 'set–nov' },
      { name: 'Rio Araguaia', season: 'jun–set' },
    ],
    mapPins: [
      { x: '34%', y: '34%', label: 'Mamirauá' },
      { x: '52%', y: '46%', label: 'Araguaia' },
    ],
  },
  {
    name: 'Marlim-azul',
    scientificName: 'Makaira nigricans',
    family: 'Istiophoridae',
    difficulty: 'LEGENDARY',
    baseXp: 150,
    habitat: 'Salgada',
    averageSizeCm: 350,
    diet: 'Carnívoro',
    tone: ['#182c52', '#132444'],
    description:
      'Troféu do oceano aberto. Corrida de centenas de metros — pesque com cadeira de luta e solte com cuidado.',
    baits: ['Trolling de superfície', 'Cavala viva'],
    regions: [
      { name: 'Vitória (ES)', season: 'nov–mar' },
      { name: 'Cabo Frio offshore', season: 'dez–abr' },
    ],
    mapPins: [
      { x: '64%', y: '52%', label: 'ES' },
      { x: '60%', y: '60%', label: 'RJ' },
    ],
  },
]

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
  { id: '29714e9d-f4e5-42df-bfc8-e044bcd72b52', userKey: 'gedson', speciesName: 'Betta', capturedAt: daysAgo(6), locationName: 'Aquário 40 L — casa', weightGrams: null, lengthCm: null },
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
    const record = await prisma.species.upsert({
      where: { name: s.name },
      update: {
        scientificName: s.scientificName,
        family: s.family,
        difficulty: s.difficulty,
        baseXp: s.baseXp,
        description: s.description,
        dexOrder: i + 1,
        habitat: s.habitat,
        averageSizeCm: s.averageSizeCm,
        diet: s.diet,
        baits: s.baits,
        regions: s.regions,
        mapPins: s.mapPins,
        tone: s.tone,
      },
      create: {
        name: s.name,
        scientificName: s.scientificName,
        family: s.family,
        difficulty: s.difficulty,
        baseXp: s.baseXp,
        description: s.description,
        dexOrder: i + 1,
        habitat: s.habitat,
        averageSizeCm: s.averageSizeCm,
        diet: s.diet,
        baits: s.baits,
        regions: s.regions,
        mapPins: s.mapPins,
        tone: s.tone,
      },
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

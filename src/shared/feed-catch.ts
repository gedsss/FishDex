import type { ReactionEmoji } from '../../generated/prisma/enums'
import type { CatchesRepository } from '../modules/catches/catches.repository'
import type { ReactionsRepository } from '../modules/reactions/reactions.repository'
import { avatarToneFor } from './avatar-tone'

// Captura crua vinda do Prisma com o autor embutido.
interface CatchWithAuthor {
  id: string
  userId: string
  speciesId: string
  photoUrl: string
  xpAwarded: number
  capturedAt: Date
  createdAt: Date
  weightGrams: number | null
  lengthCm: number | null
  locationLat: number | null
  locationLng: number | null
  locationName: string | null
  user: {
    id: string
    username: string
    level: number
    avatarUrl: string | null
  }
}

// Captura enriquecida para o app mobile: mesmos campos da captura + dados do
// autor, contadores de reação, a reação do próprio usuário e o marcador de
// "nova espécie". É o formato que o front (`FeedCatch`) espera no feed, nas
// "minhas postagens" e no detalhe de uma captura.
export interface FeedCatchDTO {
  id: string
  userId: string
  speciesId: string
  photoUrl: string
  xpAwarded: number
  capturedAt: Date
  createdAt: Date
  weightGrams: number | null
  lengthCm: number | null
  locationLat: number | null
  locationLng: number | null
  locationName: string | null
  authorUsername: string
  authorLevel: number
  authorAvatarUrl: string | null
  authorAvatarTone: [string, string]
  reactionCounts: Partial<Record<ReactionEmoji, number>>
  myReaction: ReactionEmoji | null
  isNewSpecies: boolean
  mine: boolean
}

interface EnrichDeps {
  reactionsRepository: ReactionsRepository
  catchesRepository: CatchesRepository
}

export async function toFeedCatches(
  catches: CatchWithAuthor[],
  viewerId: string,
  deps: EnrichDeps
): Promise<FeedCatchDTO[]> {
  if (catches.length === 0) return []

  const catchIds = catches.map(c => c.id)
  const authorIds = [...new Set(catches.map(c => c.userId))]

  const [countRows, viewerRows, earliestRows] = await Promise.all([
    deps.reactionsRepository.countByCatchIdsGroupedByEmoji(catchIds),
    deps.reactionsRepository.findViewerReactions(catchIds, viewerId),
    deps.catchesRepository.earliestCaptureByUserSpecies(authorIds),
  ])

  type Counts = Partial<Record<ReactionEmoji, number>>
  const countsByCatch = new Map<string, Counts>()
  for (const row of countRows) {
    const bucket = countsByCatch.get(row.catchId) ?? {}
    bucket[row.emoji] = row._count.emoji
    countsByCatch.set(row.catchId, bucket)
  }

  const viewerByCatch = new Map<string, ReactionEmoji>()
  for (const row of viewerRows) {
    viewerByCatch.set(row.catchId, row.emoji)
  }

  const earliestByUserSpecies = new Map<string, number>()
  for (const row of earliestRows) {
    if (row._min.capturedAt) {
      earliestByUserSpecies.set(
        `${row.userId}:${row.speciesId}`,
        row._min.capturedAt.getTime()
      )
    }
  }

  return catches.map(c => {
    const earliest = earliestByUserSpecies.get(`${c.userId}:${c.speciesId}`)

    return {
      id: c.id,
      userId: c.userId,
      speciesId: c.speciesId,
      photoUrl: c.photoUrl,
      xpAwarded: c.xpAwarded,
      capturedAt: c.capturedAt,
      createdAt: c.createdAt,
      weightGrams: c.weightGrams,
      lengthCm: c.lengthCm,
      locationLat: c.locationLat,
      locationLng: c.locationLng,
      locationName: c.locationName,
      authorUsername: c.user.username,
      authorLevel: c.user.level,
      authorAvatarUrl: c.user.avatarUrl,
      authorAvatarTone: avatarToneFor(c.user.id),
      reactionCounts: countsByCatch.get(c.id) ?? {},
      myReaction: viewerByCatch.get(c.id) ?? null,
      isNewSpecies:
        earliest === undefined || c.capturedAt.getTime() === earliest,
      mine: c.userId === viewerId,
    }
  })
}

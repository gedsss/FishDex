import z from 'zod'
import { ReactionEmoji } from '../../../generated/prisma/enums'

export const reactionParamsSchema = z.object({
  catchId: z.uuid(),
})

export const reactBodySchema = z.object({
  emoji: z.nativeEnum(ReactionEmoji),
})

export type ReactionBodyDTO = z.infer<typeof reactBodySchema>

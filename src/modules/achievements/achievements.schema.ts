import { z } from 'zod'

export const achievementParamsSchema = z.object({
  id: z.uuid(),
})

export const userAchievementsParamsSchema = z.object({
  id: z.uuid(),
})

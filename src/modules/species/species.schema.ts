import { z } from 'zod'

export const GetSpeciesByIdParamsSchema = z.object({
  id: z.uuid(),
})

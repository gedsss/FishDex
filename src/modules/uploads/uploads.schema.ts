import { z } from 'zod'

export const GetUploadParamsSchema = z.object({
  id: z.uuid(),
})

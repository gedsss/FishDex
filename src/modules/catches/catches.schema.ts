import { z } from 'zod'

export const CreateCatchBodySchema = z.object({
  speciesId: z.string().uuid(),
  photoUrl: z.string(),
  capturedAt: z.coerce.date(),
  weightGrams: z.number().positive().optional(),
  lengthCm: z.number().positive().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  locationName: z.string().optional(),
})

export const GetCatchByIdParamsSchema = z.object({
  id: z.string().uuid(),
})

// Paginação opcional para GET /catches/me: sem query devolve tudo (uso do
// perfil/diário), com page+limit devolve uma página (uso do feed "Minhas
// postagens").
export const GetMyCatchesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
})

export const GetUserCatchesParamsSchema = z.object({
  id: z.string().uuid(),
})

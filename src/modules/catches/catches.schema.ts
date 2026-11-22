import { z } from 'zod'
import { UPLOAD_URL_REGEX } from '../uploads/uploads.service'

export const CreateCatchBodySchema = z.object({
  speciesId: z.string().uuid(),
  // Só aceita a url devolvida por POST /uploads ("/uploads/<uuid>"); dono e
  // existência são conferidos no service.
  photoUrl: z
    .string()
    .regex(UPLOAD_URL_REGEX, 'deve ser a url devolvida por POST /uploads'),
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

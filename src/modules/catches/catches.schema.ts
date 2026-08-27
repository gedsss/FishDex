import { z } from "zod";

export const CreateCatchBodySchema = z.object({
    speciesId: z.string().uuid(),
    photoUrl: z.string(),
    capturedAt: z.coerce.date(),
    weightGrams: z.number().positive().optional(),
    lengthCm: z.number().positive().optional(),
    locationLat: z.number().optional(),
    locationLng: z.number().optional(),
    locationName: z.string().optional(),
});

export const GetCatchByIdParamsSchema = z.object({
    id: z.string().uuid()
});

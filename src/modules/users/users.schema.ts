import { z } from "zod";

export const GetUserByIdParamsSchema = z.object({
    id: z.string().uuid()
});

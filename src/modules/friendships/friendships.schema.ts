import z from "zod";

export const sendFriendRequest = z.object({
  targetUserId: z.uuid(),
});

export type sendFriendRequestDTO = z.infer<typeof sendFriendRequest>;

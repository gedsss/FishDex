import { Prisma } from "../../../generated/prisma/client";
import { Friendship, FriendshipStatus } from "../../../generated/prisma/client";
import { prisma } from "../../../prisma/prisma.client";
import { ConflictError } from "../../shared/errors";

export class FriendshipRepository {
  sortPair(idA: string, idB: string): { userAId: string; userBId: string } {
    return idA.localeCompare(idB) <= 0
      ? { userAId: idA, userBId: idB }
      : { userAId: idB, userBId: idA };
  }

  async findPair(userAId: string, userBId: string): Promise<Friendship | null> {
    const sorted = this.sortPair(userAId, userBId);

    return prisma.friendship.findUnique({
      where: {
        userAId_userBId: {
          userAId: sorted.userAId,
          userBId: sorted.userBId,
        },
      },
    });
  }

  async createFriendship(data: {
    senderId: string;
    receiverId: string;
  }): Promise<Friendship> {
    const sorted = this.sortPair(data.senderId, data.receiverId);

    try {
      return await prisma.friendship.create({
        data: {
          userAId: sorted.userAId,
          userBId: sorted.userBId,
          requestedById: data.senderId,
          status: FriendshipStatus.PENDING,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictError("amizade ja existe");
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Friendship | null> {
    return prisma.friendship.findUnique({ where: { id } });
  }

  async updateStatus(
    id: string,
    status: FriendshipStatus,
  ): Promise<Friendship> {
    return prisma.friendship.update({ where: { id }, data: { status } });
  }

  async findManyByUser(userId: string): Promise<Friendship[]> {
    return prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { respondedAt: "desc" },
    });
  }
}

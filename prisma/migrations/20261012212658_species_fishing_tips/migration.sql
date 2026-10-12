-- AlterTable
ALTER TABLE "species" ADD COLUMN     "bestTime" TEXT,
ADD COLUMN     "closedSeasons" JSONB,
ADD COLUMN     "techniques" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tipsReviewed" BOOLEAN NOT NULL DEFAULT false;

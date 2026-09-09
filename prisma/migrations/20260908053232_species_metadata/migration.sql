-- AlterTable
ALTER TABLE "species" ADD COLUMN     "averageSizeCm" INTEGER,
ADD COLUMN     "baits" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dexOrder" INTEGER,
ADD COLUMN     "diet" TEXT,
ADD COLUMN     "family" TEXT,
ADD COLUMN     "habitat" TEXT,
ADD COLUMN     "mapPins" JSONB,
ADD COLUMN     "regions" JSONB,
ADD COLUMN     "tone" TEXT[] DEFAULT ARRAY[]::TEXT[];

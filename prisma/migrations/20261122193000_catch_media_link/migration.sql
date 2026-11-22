-- AlterTable
ALTER TABLE "catches" ADD COLUMN     "mediaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "catches_mediaId_key" ON "catches"("mediaId");

-- CreateIndex
CREATE INDEX "media_createdAt_idx" ON "media"("createdAt");

-- AddForeignKey
ALTER TABLE "catches" ADD CONSTRAINT "catches_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: vincula capturas que já apontam para um upload do banco
-- ("/uploads/<id>"), para que essas fotos não sejam tratadas como órfãs.
UPDATE "catches" c
SET "mediaId" = m."id"
FROM "media" m
WHERE c."photoUrl" = '/uploads/' || m."id"
  AND c."userId" = m."userId"
  AND c."mediaId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "catches" c2 WHERE c2."mediaId" = m."id");

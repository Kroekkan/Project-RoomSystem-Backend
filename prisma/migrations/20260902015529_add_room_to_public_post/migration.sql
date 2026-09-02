-- AlterTable
ALTER TABLE "PublicPost" ADD COLUMN     "roomId" INTEGER;

-- CreateIndex
CREATE INDEX "PublicPost_roomId_idx" ON "PublicPost"("roomId");

-- AddForeignKey
ALTER TABLE "PublicPost" ADD CONSTRAINT "PublicPost_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "PostCategory" AS ENUM ('GENERAL', 'DAMAGED', 'LOST', 'FOUND', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "PublicPost" (
    "id" SERIAL NOT NULL,
    "category" "PostCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "location" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicPost_category_idx" ON "PublicPost"("category");

-- CreateIndex
CREATE INDEX "PublicPost_createdAt_idx" ON "PublicPost"("createdAt");

-- AddForeignKey
ALTER TABLE "PublicPost" ADD CONSTRAINT "PublicPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

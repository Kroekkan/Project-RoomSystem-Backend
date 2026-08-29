/*
  Warnings:

  - You are about to drop the column `head4er` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "head4er",
ADD COLUMN     "header" TEXT NOT NULL DEFAULT '#343a40';

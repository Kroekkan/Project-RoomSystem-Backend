/*
  Warnings:

  - You are about to drop the column `background` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `header` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `navbar` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "background",
DROP COLUMN "header",
DROP COLUMN "navbar",
ADD COLUMN     "themeSettings" JSONB;

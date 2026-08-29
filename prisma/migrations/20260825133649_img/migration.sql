-- AlterTable
ALTER TABLE "PublicPost" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "background" SET DEFAULT '#f3f4f6',
ALTER COLUMN "navbar" SET DEFAULT '#111827';

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "public"."Booking" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "userId" INTEGER,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT,
    "phone" TEXT,
    "lineId" TEXT,
    "day" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Room" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'ห้องเรียนทั่วไป',
    "building" TEXT NOT NULL DEFAULT 'อาคาร 1',

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Schedule" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "teacher" TEXT NOT NULL DEFAULT '-',
    "classroom" TEXT NOT NULL DEFAULT '-',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "branch" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "picture" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lineId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_name_key" ON "public"."Room"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_roomId_day_period_key" ON "public"."Schedule"("roomId" ASC, "day" ASC, "period" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Schedule" ADD CONSTRAINT "Schedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

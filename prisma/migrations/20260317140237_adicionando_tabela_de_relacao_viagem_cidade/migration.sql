/*
  Warnings:

  - You are about to drop the column `cityId` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `client` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `informationPrice` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `notesExtraExpense` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Trip` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Trip" DROP CONSTRAINT "Trip_cityId_fkey";

-- AlterTable
ALTER TABLE "Trip" DROP COLUMN "cityId",
DROP COLUMN "client",
DROP COLUMN "informationPrice",
DROP COLUMN "notesExtraExpense",
DROP COLUMN "price";

-- CreateTable
CREATE TABLE "TripCity" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "cityId" INTEGER NOT NULL,
    "clients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prices" DECIMAL(65,30)[] DEFAULT ARRAY[]::DECIMAL(65,30)[],
    "information" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripCity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripCity_tripId_cityId_idx" ON "TripCity"("tripId", "cityId");

-- AddForeignKey
ALTER TABLE "TripCity" ADD CONSTRAINT "TripCity_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripCity" ADD CONSTRAINT "TripCity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

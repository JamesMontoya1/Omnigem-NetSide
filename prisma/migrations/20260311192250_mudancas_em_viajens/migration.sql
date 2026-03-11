/*
  Warnings:

  - You are about to drop the column `destination` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `drivers` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `travelers` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `vehicle` on the `Trip` table. All the data in the column will be lost.
  - You are about to alter the column `mealExpense` on the `Trip` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `fuelExpense` on the `Trip` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `extraExpense` on the `Trip` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `kmDriven` on the `Trip` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `costPerKm` on the `Trip` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `profitPerKm` on the `Trip` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `avgConsumption` on the `Trip` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `remainingAutonomy` on the `Trip` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - Added the required column `cityId` to the `Trip` table without a default value. This is not possible if the table is not empty.
  - Added the required column `installationTraining` to the `Trip` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Trip" DROP COLUMN "destination",
DROP COLUMN "drivers",
DROP COLUMN "notes",
DROP COLUMN "total",
DROP COLUMN "travelers",
DROP COLUMN "vehicle",
ADD COLUMN     "cityId" INTEGER NOT NULL,
ADD COLUMN     "driverId" INTEGER,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "notesExtraExpense" TEXT,
ADD COLUMN     "vehicleId" INTEGER,
DROP COLUMN "installationTraining",
ADD COLUMN     "installationTraining" INTEGER NOT NULL,
ALTER COLUMN "mealExpense" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "fuelExpense" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "extraExpense" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "kmDriven" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "costPerKm" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "profitPerKm" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "avgConsumption" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "remainingAutonomy" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Worker" ADD COLUMN     "doesShifts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "doesTravel" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT DEFAULT 'BR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "plate" TEXT,
    "model" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TripToWorker" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TripToWorker_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "_TripToWorker_B_index" ON "_TripToWorker"("B");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TripToWorker" ADD CONSTRAINT "_TripToWorker_A_fkey" FOREIGN KEY ("A") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TripToWorker" ADD CONSTRAINT "_TripToWorker_B_fkey" FOREIGN KEY ("B") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

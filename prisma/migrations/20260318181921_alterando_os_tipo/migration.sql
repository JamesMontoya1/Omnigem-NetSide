/*
  Warnings:

  - The `nextOilChange` column on the `Trip` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `nextOilChange` column on the `Vehicle` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Trip" DROP COLUMN "nextOilChange",
ADD COLUMN     "nextOilChange" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "nextOilChange",
ADD COLUMN     "nextOilChange" TIMESTAMP(3);

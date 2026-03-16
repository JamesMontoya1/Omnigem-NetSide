/*
  Warnings:

  - The `client` column on the `Trip` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `price` column on the `Trip` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "informationPrice" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "client",
ADD COLUMN     "client" TEXT[],
DROP COLUMN "price",
ADD COLUMN     "price" DECIMAL(65,30)[] DEFAULT ARRAY[]::DECIMAL(65,30)[];

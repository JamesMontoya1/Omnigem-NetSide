/*
  Warnings:

  - A unique constraint covering the columns `[pontoSimplesUserId]` on the table `Worker` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Worker" ADD COLUMN     "pontoSimplesUserId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Worker_pontoSimplesUserId_key" ON "Worker"("pontoSimplesUserId");

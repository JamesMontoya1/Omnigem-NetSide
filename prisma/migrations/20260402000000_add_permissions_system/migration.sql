-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PermissionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PermissionToPermissionGroup" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_PermissionToPermissionGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionGroup_name_key" ON "PermissionGroup"("name");

-- CreateIndex
CREATE INDEX "_PermissionToPermissionGroup_B_index" ON "_PermissionToPermissionGroup"("B");

-- AddForeignKey
ALTER TABLE "_PermissionToPermissionGroup" ADD CONSTRAINT "_PermissionToPermissionGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToPermissionGroup" ADD CONSTRAINT "_PermissionToPermissionGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "PermissionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add permissionGroupId column (before dropping roles)
ALTER TABLE "User" ADD COLUMN "permissionGroupId" INTEGER;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_permissionGroupId_fkey" FOREIGN KEY ("permissionGroupId") REFERENCES "PermissionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default permissions (one per screen)
INSERT INTO "Permission" ("key", "label") VALUES
  ('shifts', 'Plantões'),
  ('vacations', 'Férias'),
  ('trips', 'Viagens'),
  ('sped_control', 'Controle SPED'),
  ('time_punches', 'Registro de Ponto'),
  ('users', 'Gerenciar Usuários');

-- Seed default permission groups
INSERT INTO "PermissionGroup" ("name", "description", "isAdmin") VALUES
  ('Administrador', 'Acesso total ao sistema', true),
  ('Visitante', 'Acesso limitado', false);

-- Connect ALL permissions to the Administrador group
INSERT INTO "_PermissionToPermissionGroup" ("A", "B")
SELECT p."id", pg."id"
FROM "Permission" p, "PermissionGroup" pg
WHERE pg."name" = 'Administrador';

-- Migrate existing users: those with ADMIN role → Administrador group
UPDATE "User" SET "permissionGroupId" = (
  SELECT "id" FROM "PermissionGroup" WHERE "name" = 'Administrador'
) WHERE 'ADMIN' = ANY("roles");

-- All other users → Visitante group
UPDATE "User" SET "permissionGroupId" = (
  SELECT "id" FROM "PermissionGroup" WHERE "name" = 'Visitante'
) WHERE "permissionGroupId" IS NULL;

-- Now safe to drop the old roles column
ALTER TABLE "User" DROP COLUMN "roles";

-- Drop the old Role enum
DROP TYPE "public"."Role";

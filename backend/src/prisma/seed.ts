import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  const prisma = new PrismaClient();
  const adminEmail = process.env.ADMIN_EMAIL || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const hashed = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashed, roles: ['ADMIN'] },
    create: { email: adminEmail, password: hashed, roles: ['ADMIN'], name: 'Administrator' },
  });

  console.log(`Seeded admin: ${adminEmail} (password from ADMIN_PASSWORD env or 'admin123')`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

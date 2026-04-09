'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin1@csc309.utoronto.ca';
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const existing = await prisma.account.findUnique({
    where: { email },
  });

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role: 'ADMIN',
        activated: true,
        resetToken: null,
        resetTokenExpiresAt: null,
        resetTokenUsedAt: null,
      },
    });

    await prisma.admin.upsert({
      where: { id: existing.id },
      update: { utorid: 'admin1' },
      create: { id: existing.id, utorid: 'admin1' },
    });

    console.log(`Database seed complete. Admin id=${existing.id}`);
    return;
  }

  const account = await prisma.account.create({
    data: {
      email,
      passwordHash,
      role: 'ADMIN',
      activated: true,
    },
  });

  await prisma.admin.create({
    data: {
      id: account.id,
      utorid: 'admin1',
    },
  });

  console.log(`Database seed complete. Admin id=${account.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
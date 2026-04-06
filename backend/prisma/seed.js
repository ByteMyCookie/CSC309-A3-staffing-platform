/*
 * If you need to initialize your database with some data, you may write a script
 * to do so here.
 */
'use strict';

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Intentionally minimal.
  // The autotester runs this during setup.
  // Do not insert sample data here unless your implementation truly depends on it.
  await prisma.$connect();
  console.log('Database seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
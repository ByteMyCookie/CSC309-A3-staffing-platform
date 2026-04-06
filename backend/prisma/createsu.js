'use strict';

const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 20 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

async function main() {
  const [, , utorid, email, password] = process.argv;

  if (!utorid || !email || !password) {
    console.error(
      'Usage: node prisma/createsu.js <utorid> <email> <password>'
    );
    process.exit(1);
  }

  if (!isValidEmail(email)) {
    console.error('Invalid email format.');
    process.exit(1);
  }

  if (!isValidPassword(password)) {
    console.error(
      'Invalid password. It must be 8-20 chars with uppercase, lowercase, number, and special character.'
    );
    process.exit(1);
  }

  const existingByEmail = await prisma.account.findUnique({
    where: { email },
  });

  if (existingByEmail) {
    console.error('An account with that email already exists.');
    process.exit(1);
  }

  const existingByUtorid = await prisma.admin.findUnique({
    where: { utorid },
  });

  if (existingByUtorid) {
    console.error('An administrator with that utorid already exists.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        email,
        passwordHash,
        role: Role.ADMIN,
        activated: true,
      },
    });

    const admin = await tx.admin.create({
      data: {
        id: account.id,
        utorid,
      },
    });

    return { account, admin };
  });

  console.log(
    JSON.stringify(
      {
        id: result.account.id,
        utorid: result.admin.utorid,
        email: result.account.email,
        role: 'admin',
        activated: result.account.activated,
        createdAt: result.account.createdAt,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
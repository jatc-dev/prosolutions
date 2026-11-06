import bcrypt from 'bcrypt';
import { Module } from '@prisma/client';
import prisma from '../src/prismaClient';

const REQUIRED_ENVIRONMENT = ['ADMIN_EMAIL', 'ADMIN_PASSWORD'] as const;

function getRequiredEnvironment(name: (typeof REQUIRED_ENVIRONMENT)[number]): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set before running the Identity seed`);
  }
  return value;
}

async function main() {
  const email = getRequiredEnvironment('ADMIN_EMAIL').toLowerCase();
  const password = getRequiredEnvironment('ADMIN_PASSWORD');

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const modules = Object.values(Module);

  const admin = await prisma.$transaction(async tx => {
    const user = await tx.user.upsert({
      where: { email },
      update: {
        passwordHash,
        role: 'admin',
        emailVerified: true,
        isActive: true,
      },
      create: {
        email,
        passwordHash,
        role: 'admin',
        emailVerified: true,
        isActive: true,
        name: 'Administrator',
      },
    });

    for (const module of modules) {
      await tx.moduleAccess.upsert({
        where: { userId_module: { userId: user.id, module } },
        update: { active: true, expiresAt: null },
        create: { userId: user.id, module, active: true },
      });
    }

    return user;
  });

  console.info(`Identity administrator seeded: ${admin.email}`);
}

main()
  .catch((error: unknown) => {
    console.error(
      'Identity administrator seed failed:',
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

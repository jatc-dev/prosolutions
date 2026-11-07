const bcrypt = require("bcrypt");
const { PrismaClient, Module } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password || password.length < 12) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) are required");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "admin",
      emailVerified: true,
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      role: "admin",
      emailVerified: true,
      isActive: true,
      name: "QA Administrator",
    },
  });

  for (const module of Object.values(Module)) {
    await prisma.moduleAccess.upsert({
      where: { userId_module: { userId: user.id, module } },
      update: { active: true, expiresAt: null },
      create: { userId: user.id, module, active: true },
    });
  }

  process.stdout.write(`QA administrator provisioned: ${user.email}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`QA administrator provisioning failed: ${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

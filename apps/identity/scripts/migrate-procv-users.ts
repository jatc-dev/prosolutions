import { PrismaClient } from '@prisma/client';

/**
 * Migra usuarios de la base de datos de ProCV a ProSolutions Identity.
 *
 * Requisitos de entorno:
 *   DATABASE_URL            -> base de datos de Identity (destino)
 *   PROCV_DATABASE_URL      -> base de datos de ProCV (origen)
 *
 * El script es idempotente: si un email ya existe en Identity, se salta.
 * Cada usuario se migra dentro de una transacción (User + ProfessionalProfile + ModuleAccess PROCV).
 */

interface ProCvUser {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: string;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const identityPrisma = new PrismaClient();
// Segunda instancia de PrismaClient apuntando al esquema de ProCV (origen).
const procvPrisma = new PrismaClient({
  datasourceUrl: process.env.PROCV_DATABASE_URL,
});

async function main() {
  if (!process.env.PROCV_DATABASE_URL) {
    throw new Error('PROCV_DATABASE_URL no está definido. Abortando migración.');
  }

  console.log('[migración] Leyendo usuarios de ProCV...');

  const users = await procvPrisma.$queryRawUnsafe<ProCvUser[]>(
    `SELECT id, email, name, passwordHash, role, emailVerified, lastLoginAt, createdAt, updatedAt FROM "User"`
  );

  console.log(`[migración] ${users.length} usuarios encontrados en ProCV.`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (const user of users) {
    try {
      // Idempotencia: saltar si el email ya existe en Identity.
      const existing = await identityPrisma.user.findUnique({
        where: { email: user.email },
        select: { id: true },
      });

      if (existing) {
        console.log(`[migración] Saltado (ya existe): ${user.email}`);
        skipped++;
        continue;
      }

      // Transacción atómica: usuario + perfil profesional + acceso al módulo PROCV.
      await identityPrisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: user.passwordHash,
            role: user.role,
            emailVerified: user.emailVerified,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            isActive: true,
          },
        });

        await tx.professionalProfile.create({
          data: {
            userId: created.id,
            headline: null,
            summary: null,
            location: null,
            avatarUrl: null,
            skills: '[]',
            experience: '[]',
            education: '[]',
            links: '{}',
            phone: null,
            birthDate: null,
          },
        });

        await tx.moduleAccess.create({
          data: {
            userId: created.id,
            module: 'PROCV',
            active: true,
            expiresAt: null,
          },
        });
      });

      console.log(`[migración] Migrado: ${user.email} (id: ${user.id})`);
      migrated++;
    } catch (error: unknown) {
      errors++;
      const msg = error instanceof Error ? error.message : String(error);
      errorDetails.push(`${user.email}: ${msg}`);
      console.error(`[migración] Error migrando ${user.email}:`, msg);
    }
  }

  await procvPrisma.$disconnect();
  await identityPrisma.$disconnect();

  console.log('\n=== Resumen de migración ===');
  console.log(`Total en ProCV:   ${users.length}`);
  console.log(`Migrados:         ${migrated}`);
  console.log(`Saltados:         ${skipped}`);
  console.log(`Errores:          ${errors}`);

  if (errorDetails.length > 0) {
    console.log('\nDetalles de errores:');
    errorDetails.forEach((d) => console.log(` - ${d}`));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[migración] Error fatal:', error);
  process.exitCode = 1;
});

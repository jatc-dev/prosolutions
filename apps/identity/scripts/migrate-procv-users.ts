import { PrismaClient } from '@prisma/client';

/**
 * Migra usuarios de ProCV a ProIdentity.
 *
 * DATABASE_URL       -> base de datos de Identity (destino)
 * PROCV_DATABASE_URL -> base de datos de ProCV (origen)
 *
 * Usa --dry-run para validar el origen y detectar conflictos sin escribir.
 * Usa --overwrite para actualizar usuarios existentes con el mismo id.
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

const dryRun = process.argv.includes('--dry-run');
const overwrite = process.argv.includes('--overwrite');
const identityPrisma = new PrismaClient();
const procvPrisma = new PrismaClient({
  datasourceUrl: process.env.PROCV_DATABASE_URL,
});

async function main() {
  if (!process.env.PROCV_DATABASE_URL) {
    throw new Error('PROCV_DATABASE_URL no está definido. Abortando migración.');
  }

  console.log(
    `[migración] Modo: ${dryRun ? 'dry-run (sin escrituras)' : 'escritura'}${overwrite ? ', sobrescritura activada' : ''}`,
  );
  console.log('[migración] Leyendo usuarios de ProCV...');

  const users = await procvPrisma.$queryRawUnsafe<ProCvUser[]>(
    `SELECT id, email, name, "passwordHash", role, "emailVerified", "lastLoginAt", "createdAt", "updatedAt" FROM "User"`,
  );

  console.log(`[migración] ${users.length} usuarios encontrados en ProCV.`);

  let migrated = 0;
  let skipped = 0;
  let overwritten = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (const user of users) {
    try {
      const email = user.email.toLowerCase().trim();
      if (!email) {
        throw new Error('el usuario no tiene un email válido');
      }

      const existingById = await identityPrisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
        },
      });
      const existingByEmail = existingById
        ? null
        : await identityPrisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
            },
          });
      const existing = existingById ?? existingByEmail;

      if (existing) {
        if (dryRun) {
          console.log(
            `[migración] ${
              overwrite ? 'Listo para sobrescribir' : 'Ya existe'
            }: ${email} (Identity id: ${existing.id})`,
          );
          skipped++;
          continue;
        }

        if (!overwrite) {
          console.log(`[migración] Saltado (ya existe): ${email}`);
          skipped++;
          continue;
        }

        await identityPrisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: existing.id },
            data: {
              email,
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
        });

        console.log(`[migración] Sobrescrito: ${email} (Identity id: ${existing.id})`);
        overwritten++;
        continue;
      }

      const emailConflict = await identityPrisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (emailConflict) {
        throw new Error(
          `conflicto de email: Identity=${emailConflict.id}, ProCV=${user.id}`,
        );
      }

      if (dryRun) {
        console.log(`[migración] Listo para migrar: ${email} (id: ${user.id})`);
        migrated++;
        continue;
      }

      await identityPrisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            id: user.id,
            email,
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
            skills: [],
            experience: [],
            education: [],
            links: {},
          },
        });

        await tx.moduleAccess.create({
          data: { userId: created.id, module: 'PROCV', active: true },
        });
      });

      console.log(`[migración] Migrado: ${email} (id: ${user.id})`);
      migrated++;
    } catch (error: unknown) {
      errors++;
      const message = error instanceof Error ? error.message : String(error);
      errorDetails.push(`${user.email}: ${message}`);
      console.error(`[migración] Error migrando ${user.email}: ${message}`);
    }
  }

  console.log('\n=== Resumen de migración ===');
  console.log(`Total en ProCV:   ${users.length}`);
  console.log(`Migrados/listos:  ${migrated}`);
  console.log(`Saltados:         ${skipped}`);
  console.log(`Sobrescritos:     ${overwritten}`);
  console.log(`Errores:          ${errors}`);

  if (errorDetails.length > 0) {
    console.log('\nDetalles de errores:');
    errorDetails.forEach((detail) => console.log(` - ${detail}`));
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error('[migración] Error fatal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([
      procvPrisma.$disconnect(),
      identityPrisma.$disconnect(),
    ]);
  });

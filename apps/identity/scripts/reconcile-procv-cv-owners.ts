import { PrismaClient } from '@prisma/client';

interface BasicUser {
  id: string;
  email: string;
}

interface OwnerCount {
  userId: string;
  count: number;
}

const apply = process.argv.includes('--apply');
const identity = new PrismaClient();
const procvUrl = process.env.PROCV_DATABASE_URL;

if (!procvUrl) {
  throw new Error('PROCV_DATABASE_URL must point to the ProCV PostgreSQL database. No changes have been made.');
}

const procv = new PrismaClient({ datasourceUrl: procvUrl });

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function main() {
  const [legacyUsers, identityUsers, owners] = await Promise.all([
    procv.$queryRaw<BasicUser[]>`SELECT "id", "email" FROM public."User" ORDER BY "id"`,
    identity.$queryRaw<BasicUser[]>`SELECT "id", "email" FROM public."User" ORDER BY "id"`,
    procv.$queryRaw<OwnerCount[]>`
      SELECT "userId", COUNT(*)::int AS count
      FROM public."CV"
      GROUP BY "userId"
      ORDER BY "userId"
    `,
  ]);

  const identityByEmail = new Map(identityUsers.map((user) => [normalizeEmail(user.email), user]));
  const identityById = new Map(identityUsers.map((user) => [user.id, user]));
  const legacyById = new Map(legacyUsers.map((user) => [user.id, user]));
  const cvsByOwner = new Map(owners.map((row) => [row.userId, Number(row.count)]));
  const ownersToReassign: Array<{ oldId: string; newId: string; count: number }> = [];
  const unresolved: Array<{ count: number }> = [];
  let unchanged = 0;
  let legacyUsersWithoutCvs = 0;

  // Plan every ownership change before executing any writes. Normalized email
  // is the migration key when IDs changed; an existing Identity ID is a safe
  // fallback for users whose account email was changed after migration.
  for (const [oldId, count] of cvsByOwner) {
    const legacyUser = legacyById.get(oldId);
    if (!legacyUser) {
      if (identityById.has(oldId)) {
        unchanged += count;
        continue;
      }
      unresolved.push({ count });
      continue;
    }

    const target = identityByEmail.get(normalizeEmail(legacyUser.email)) ?? identityById.get(oldId);
    if (!target) {
      unresolved.push({ count });
      continue;
    }

    if (target.id === oldId) {
      unchanged += count;
      continue;
    }

    ownersToReassign.push({ oldId, newId: target.id, count });
  }

  legacyUsersWithoutCvs = legacyUsers.filter((user) => !cvsByOwner.has(user.id)).length;
  const totalCvs = owners.reduce((sum, row) => sum + Number(row.count), 0);

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    identityUsers: identityUsers.length,
    legacyProCvUsers: legacyUsers.length,
    totalCVs: totalCvs,
    CVsAlreadyOwnedByIdentityId: unchanged,
    ownershipChangesPlanned: ownersToReassign.length,
    CVsToReassign: ownersToReassign.reduce((sum, row) => sum + row.count, 0),
    legacyUsersWithoutCVs,
    unresolvedOwners: unresolved.length,
  }, null, 2));

  if (unresolved.length > 0) {
    throw new Error('Some CV owners could not be matched to ProIdentity. Stopped before writing; inspect ownership records manually.');
  }

  if (!apply) {
    console.log('Dry run only. Re-run with --apply after reviewing the summary to update CV.userId values.');
    return;
  }

  await procv.$transaction(async (tx) => {
    // CV.userId becomes an external ProIdentity subject, so drop the old FK
    // before replacing legacy ProCV IDs. The transaction restores the FK if
    // anything below fails; the later Prisma migration repeats DROP IF EXISTS.
    await tx.$executeRaw`ALTER TABLE public."CV" DROP CONSTRAINT IF EXISTS "CV_userId_fkey"`;

    for (const change of ownersToReassign) {
      const updatedRows = await tx.$executeRaw`
        UPDATE public."CV"
        SET "userId" = ${change.newId}
        WHERE "userId" = ${change.oldId}
      `;
      if (Number(updatedRows) !== change.count) {
        throw new Error('CV ownership count changed during reconciliation; transaction rolled back.');
      }
    }

    // PostgreSQL cannot join two separate Supabase projects, so verify every
    // CV owner against the Identity subject IDs read before the transaction.
    const updatedOwners = await tx.$queryRaw<Array<{ userId: string }>>`
      SELECT DISTINCT "userId" FROM public."CV"
    `;
    const unknownOwners = updatedOwners.filter((owner) => !identityById.has(owner.userId));
    if (unknownOwners.length > 0) {
      throw new Error('Some CV owners do not exist in ProIdentity; transaction rolled back.');
    }
  });

  console.log('CV ownership reconciliation completed and verified. The legacy CV foreign key is removed; apply the ProCV auth-table retirement migration next.');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'CV ownership reconciliation failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([identity.$disconnect(), procv.$disconnect()]);
  });

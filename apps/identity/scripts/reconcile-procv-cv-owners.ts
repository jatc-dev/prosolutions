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
    procv.$queryRaw<BasicUser[]>\`SELECT "id", "email" FROM public."User" ORDER BY "id"\`,
    identity.$queryRaw<BasicUser[]>\`SELECT "id", "email" FROM public."User" ORDER BY "id"\`,
    procv.$queryRaw<OwnerCount[]>\`
      SELECT "userId", COUNT(*)::int AS count
      FROM public."CV"
      GROUP BY "userId"
      ORDER BY "userId"
    \`,
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
    for (const change of ownersToReassign) {
      const updated = await tx.$executeRaw\`
        UPDATE public."CV"
        SET "userId" = ${change.newId}
        WHERE "userId" = ${change.oldId}
      \`;
      if (Number(updated) !== change.count) {
        throw new Error('CV ownership count changed during reconciliation; transaction rolled back.');
      }
    }
  });

  const remainingLegacyOwners = await procv.$queryRaw<Array<{ count: number }>>\`
    SELECT COUNT(*)::int AS count
    FROM public."CV" cv
    WHERE EXISTS (
      SELECT 1 FROM public."User" old_user WHERE old_user."id" = cv."userId"
    )
      AND NOT EXISTS (
        SELECT 1 FROM public."User" identity_user WHERE identity_user."id" = cv."userId"
      )
  \`;

  if (Number(remainingLegacyOwners[0]?.count ?? 0) > 0) {
    throw new Error('Post-update verification detected CV owners still linked to legacy-only IDs.');
  }

  console.log('CV ownership reconciliation completed and verified.');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'CV ownership reconciliation failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([identity.$disconnect(), procv.$disconnect()]);
  });

import { execFileSync } from 'node:child_process';

const migrationName = 'add_jti_column';
const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or DIRECT_DATABASE_URL must be set before running migrations');
}

const env = { ...process.env, DATABASE_URL: databaseUrl };
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function runPrisma(args) {
  return execFileSync(npx, ['prisma', ...args], {
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

let migrationStatus = '';
try {
  migrationStatus = runPrisma(['migrate', 'status']);
} catch (error) {
  const output = [
    error?.stdout?.toString() ?? '',
    error?.stderr?.toString() ?? '',
  ].join('\n');
  migrationStatus = output;

  const hasFailedMigration =
    /failed migrations?/i.test(output) && output.includes(migrationName);
  const hasPendingMigrations = /not yet been applied/i.test(output);

  if (!hasFailedMigration && !hasPendingMigrations) {
    process.stderr.write(output);
    throw new Error('Unable to determine whether Prisma migrations can proceed');
  }
}

if (/failed migrations?/i.test(migrationStatus) && migrationStatus.includes(migrationName)) {
  process.stdout.write(
    `Recovering failed Prisma migration ${migrationName}...\n`,
  );
  runPrisma(['migrate', 'resolve', '--rolled-back', migrationName]);
}

process.stdout.write('Applying Prisma production migrations...\n');
process.stdout.write(runPrisma(['migrate', 'deploy']));

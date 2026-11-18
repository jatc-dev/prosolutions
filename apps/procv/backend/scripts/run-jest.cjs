// Runs Jest with --experimental-vm-modules on every platform (Windows cmd has no
// inline env vars). pdf-parse v2 loads the pdfjs-dist worker through a dynamic
// import(), which Jest's VM sandbox rejects unless this flag is enabled.
const { spawnSync } = require('node:child_process');

const jestBin = require.resolve('jest/bin/jest');
const result = spawnSync(
  process.execPath,
  ['--experimental-vm-modules', jestBin, ...process.argv.slice(2)],
  { stdio: 'inherit' },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);

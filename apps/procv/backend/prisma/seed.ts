/**
 * ProCV stores product data only. Account creation and administration belong
 * to ProIdentity; this seed intentionally creates no local credentials.
 */
async function main() {
  console.info('ProCV does not seed local users. Create accounts through ProIdentity.');
}

main().catch((error: unknown) => {
  console.error('ProCV seed check failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

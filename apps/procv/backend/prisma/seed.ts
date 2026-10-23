/**
 * ProCV no longer creates or authenticates accounts locally.
 * Administrative identities and credentials are managed centrally by ProIdentity.
 * Keep this seed entrypoint as a harmless no-op for existing deployment scripts.
 */
async function main() {
  console.log("[ProCV] No local users are seeded. Manage administrators in ProIdentity.");
}

main().catch((error: unknown) => {
  console.error("[ProCV] Seed command failed:", error);
  process.exitCode = 1;
});

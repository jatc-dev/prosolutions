-- Optional two-step sign-in (TOTP) for ProIdentity accounts.
-- Additive only: existing code ignores these columns, so it is safe to apply before deploying.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaPendingSecret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnabledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaLastStep" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaRecoveryCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

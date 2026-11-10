-- Persist platform-wide user preferences in ProIdentity.
-- Additive and safe for existing accounts; existing users receive the defaults.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "preferences" JSONB NOT NULL DEFAULT '{}'::jsonb;

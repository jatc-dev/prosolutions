-- Google sign-in link and an append-only log of personal-data consents
-- (Ley 1581 de 2012 / GDPR): every grant or withdrawal is a new row.

ALTER TABLE "User" ADD COLUMN "googleSub" TEXT;
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "UserConsent_userId_purpose_createdAt_idx" ON "UserConsent"("userId", "purpose", "createdAt");

-- Same access model as the other ProIdentity tables in Neon (restricted
-- runtime role through proidentity_app). Skipped where the role is absent
-- (local and CI databases).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'proidentity_app') THEN
    ALTER TABLE "UserConsent" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "UserConsent_app_access" ON "UserConsent" FOR ALL TO proidentity_app USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE, DELETE ON "UserConsent" TO proidentity_app;
  END IF;
END $$;

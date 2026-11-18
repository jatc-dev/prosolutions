-- Platform-wide settings managed in ProAdmin (e.g. advertising) and the
-- contact / Habeas Data request log (Ley 1581: requests must be traceable).

CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactRequest_createdAt_idx" ON "ContactRequest"("createdAt");
CREATE INDEX "ContactRequest_topic_status_idx" ON "ContactRequest"("topic", "status");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'proidentity_app') THEN
    ALTER TABLE "PlatformSetting" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "PlatformSetting_app_access" ON "PlatformSetting" FOR ALL TO proidentity_app USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE, DELETE ON "PlatformSetting" TO proidentity_app;
    ALTER TABLE "ContactRequest" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "ContactRequest_app_access" ON "ContactRequest" FOR ALL TO proidentity_app USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE, DELETE ON "ContactRequest" TO proidentity_app;
  END IF;
END $$;

-- Replace the fixed Module enum with a registry so future ProSolutions modules
-- can be registered and granted without an enum migration.
CREATE TABLE "Module" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseUrl" TEXT,
    "apiAudience" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultForNewUsers" BOOLEAN NOT NULL DEFAULT false,
    "defaultForAdmins" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Module_pkey" PRIMARY KEY ("code")
);

CREATE UNIQUE INDEX "Module_apiAudience_key" ON "Module"("apiAudience");
CREATE INDEX "Module_enabled_displayOrder_idx" ON "Module"("enabled", "displayOrder");

INSERT INTO "Module"
    ("code", "name", "description", "baseUrl", "apiAudience", "enabled", "defaultForNewUsers", "defaultForAdmins", "displayOrder", "createdAt", "updatedAt")
VALUES
    ('PROCV', 'ProCV', 'Creador y optimizador profesional de hojas de vida.', 'https://procv.prosolutions.page', 'procv-api', true, true, true, 10, NOW(), NOW()),
    ('PROJOBS', 'ProJobs', 'Exploración y seguimiento de oportunidades laborales.', 'https://projobs.prosolutions.page', 'projobs-api', true, true, true, 20, NOW(), NOW()),
    ('PROSKILLS', 'ProSkills', 'Evaluación y desarrollo de competencias.', 'https://proskills.prosolutions.page', 'proskills-api', false, false, true, 30, NOW(), NOW()),
    ('PROCAREER', 'ProCareer', 'Planificación y crecimiento profesional.', 'https://procareer.prosolutions.page', 'procareer-api', false, false, true, 40, NOW(), NOW()),
    ('PROINTERVIEW', 'ProInterview', 'Preparación y simulación de entrevistas.', 'https://prointerview.prosolutions.page', 'prointerview-api', false, false, true, 50, NOW(), NOW()),
    ('PRORECRUIT', 'ProRecruit', 'Herramientas para selección y gestión de talento.', 'https://prorecruit.prosolutions.page', 'prorecruit-api', false, false, true, 60, NOW(), NOW());

ALTER TABLE "ModuleAccess" ADD COLUMN "moduleCode" TEXT;
UPDATE "ModuleAccess" SET "moduleCode" = "module"::text;
ALTER TABLE "ModuleAccess" ALTER COLUMN "moduleCode" SET NOT NULL;

DROP INDEX IF EXISTS "ModuleAccess_module_idx";
DROP INDEX IF EXISTS "ModuleAccess_userId_module_key";
ALTER TABLE "ModuleAccess" DROP COLUMN "module";
DROP TYPE IF EXISTS "Module";

CREATE INDEX "ModuleAccess_moduleCode_idx" ON "ModuleAccess"("moduleCode");
CREATE UNIQUE INDEX "ModuleAccess_userId_moduleCode_key" ON "ModuleAccess"("userId", "moduleCode");

ALTER TABLE "ModuleAccess"
    ADD CONSTRAINT "ModuleAccess_moduleCode_fkey"
    FOREIGN KEY ("moduleCode") REFERENCES "Module"("code")
    ON DELETE RESTRICT ON UPDATE CASCADE;

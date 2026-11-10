-- Granular administrative RBAC. User business capabilities remain separate from admin roles.
CREATE TABLE "AdminRole" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminPermission" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminRolePermission" (
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  CONSTRAINT "AdminRolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "UserAdminRole" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "module" "Module",
  "assignedById" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAdminRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminRole_key_key" ON "AdminRole"("key");
CREATE INDEX "AdminRole_key_idx" ON "AdminRole"("key");
CREATE UNIQUE INDEX "AdminPermission_key_key" ON "AdminPermission"("key");
CREATE INDEX "AdminPermission_key_idx" ON "AdminPermission"("key");
CREATE INDEX "AdminRolePermission_permissionId_idx" ON "AdminRolePermission"("permissionId");
CREATE INDEX "UserAdminRole_userId_expiresAt_idx" ON "UserAdminRole"("userId", "expiresAt");
CREATE INDEX "UserAdminRole_roleId_module_idx" ON "UserAdminRole"("roleId", "module");

ALTER TABLE "AdminRolePermission" ADD CONSTRAINT "AdminRolePermission_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "AdminRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminRolePermission" ADD CONSTRAINT "AdminRolePermission_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "AdminPermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAdminRole" ADD CONSTRAINT "UserAdminRole_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAdminRole" ADD CONSTRAINT "UserAdminRole_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "AdminRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "AdminPermission" ("id", "key", "description") VALUES
('perm_identity_users_read', 'identity.users.read', 'Read account directory and account status'),
('perm_identity_users_manage', 'identity.users.manage', 'Manage account lifecycle and module grants'),
('perm_identity_roles_read', 'identity.roles.read', 'Read administrative roles and permissions'),
('perm_identity_roles_manage', 'identity.roles.manage', 'Assign and revoke administrative roles'),
('perm_identity_roles_owner_manage', 'identity.roles.owner_manage', 'Assign or revoke platform owner'),
('perm_identity_sessions_read', 'identity.sessions.read', 'Read privileged session metadata'),
('perm_identity_sessions_revoke', 'identity.sessions.revoke', 'Revoke user sessions'),
('perm_identity_security_manage', 'identity.security.manage', 'Manage identity security policies'),
('perm_identity_audit_read', 'identity.audit.read', 'Read identity audit events'),
('perm_identity_audit_export', 'identity.audit.export', 'Export identity audit events'),
('perm_platform_modules_manage', 'platform.modules.manage', 'Manage module catalog and entitlements'),
('perm_platform_settings_manage', 'platform.settings.manage', 'Manage verified platform settings'),
('perm_platform_branding_manage', 'platform.branding.manage', 'Manage platform branding'),
('perm_platform_content_manage', 'platform.content.manage', 'Manage public platform content'),
('perm_platform_features_manage', 'platform.features.manage', 'Manage feature flags'),
('perm_platform_health_read', 'platform.health.read', 'Read service health and operational status'),
('perm_analytics_read', 'analytics.read', 'Read aggregate platform analytics'),
('perm_analytics_export', 'analytics.export', 'Export aggregate analytics'),
('perm_audit_read', 'audit.read', 'Read cross-module audit events'),
('perm_audit_export', 'audit.export', 'Export cross-module audit events'),
('perm_privacy_requests_manage', 'privacy.requests.manage', 'Process privacy and data subject requests'),
('perm_procv_admin_access', 'procv.admin.access', 'Access ProCV administrative APIs'),
('perm_procv_analytics_read', 'procv.analytics.read', 'Read ProCV aggregate analytics'),
('perm_procv_audit_read', 'procv.audit.read', 'Read ProCV audit events'),
('perm_procv_settings_read', 'procv.settings.read', 'Read ProCV operational settings'),
('perm_procv_settings_manage', 'procv.settings.manage', 'Manage verified ProCV settings'),
('perm_procv_branding_manage', 'procv.branding.manage', 'Manage ProCV branding and logo'),
('perm_procv_templates_manage', 'procv.templates.manage', 'Manage CV templates'),
('perm_procv_limits_manage', 'procv.limits.manage', 'Manage effective CV and export limits'),
('perm_procv_files_manage', 'procv.files.manage', 'Manage file policies and quotas'),
('perm_procv_cvs_support_access', 'procv.cvs.support_access', 'Perform approved temporary CV support access'),
('perm_procv_exports_manage', 'procv.exports.manage', 'Manage export policies and queues'),
('perm_projobs_admin_access', 'projobs.admin.access', 'Access ProJobs administrative APIs'),
('perm_projobs_catalog_read', 'projobs.catalog.read', 'Read job catalog and source status'),
('perm_projobs_catalog_moderate', 'projobs.catalog.moderate', 'Moderate job listings and company records'),
('perm_projobs_sources_manage', 'projobs.sources.manage', 'Manage job ingestion sources'),
('perm_projobs_alerts_manage', 'projobs.alerts.manage', 'Manage job alert policies'),
('perm_projobs_analytics_read', 'projobs.analytics.read', 'Read ProJobs aggregate analytics');

INSERT INTO "AdminRole" ("id", "key", "name", "description", "isSystem", "updatedAt") VALUES
('role_platform_owner', 'platform_owner', 'Platform owner', 'Break-glass owner with full platform governance permissions', true, CURRENT_TIMESTAMP),
('role_platform_admin', 'platform_admin', 'Platform administrator', 'Day-to-day platform administration without owner/security escalation', true, CURRENT_TIMESTAMP),
('role_security_admin', 'security_admin', 'Security administrator', 'Identity security, sessions and security audit', true, CURRENT_TIMESTAMP),
('role_support_agent', 'support_agent', 'Support agent', 'Limited account support and operational diagnostics', true, CURRENT_TIMESTAMP),
('role_content_manager', 'content_manager', 'Content manager', 'Public content and module presentation management', true, CURRENT_TIMESTAMP),
('role_analytics_viewer', 'analytics_viewer', 'Analytics viewer', 'Read-only aggregate usage and analytics', true, CURRENT_TIMESTAMP),
('role_module_admin', 'module_admin', 'Module administrator', 'Administration scoped to one assigned module', true, CURRENT_TIMESTAMP),
('role_user', 'user', 'User', 'Standard product user; no administrative permissions', true, CURRENT_TIMESTAMP);

-- The owner receives the complete permission catalog.
INSERT INTO "AdminRolePermission" ("roleId", "permissionId")
SELECT 'role_platform_owner', id FROM "AdminPermission";

-- Platform administrator: operational administration, but not owner assignment or security policy changes.
INSERT INTO "AdminRolePermission" ("roleId", "permissionId")
SELECT 'role_platform_admin', id FROM "AdminPermission"
WHERE key IN (
  'identity.users.read','identity.users.manage','identity.roles.read','identity.roles.manage',
  'identity.sessions.read','identity.sessions.revoke','identity.audit.read',
  'platform.modules.manage','platform.settings.manage','platform.branding.manage',
  'platform.content.manage','platform.features.manage','platform.health.read',
  'analytics.read','analytics.export','audit.read','audit.export',
  'procv.admin.access','procv.analytics.read','procv.audit.read','procv.settings.read','procv.settings.manage',
  'procv.branding.manage','procv.templates.manage','procv.limits.manage','procv.files.manage','procv.exports.manage',
  'projobs.admin.access','projobs.catalog.read','projobs.catalog.moderate','projobs.sources.manage',
  'projobs.alerts.manage','projobs.analytics.read'
);

INSERT INTO "AdminRolePermission" ("roleId", "permissionId")
SELECT 'role_security_admin', id FROM "AdminPermission"
WHERE key IN ('identity.users.read','identity.roles.read','identity.sessions.read','identity.sessions.revoke',
  'identity.security.manage','identity.audit.read','identity.audit.export','audit.read','audit.export');

INSERT INTO "AdminRolePermission" ("roleId", "permissionId")
SELECT 'role_support_agent', id FROM "AdminPermission"
WHERE key IN ('identity.users.read','identity.sessions.read','platform.health.read','analytics.read',
  'procv.analytics.read','procv.audit.read','projobs.catalog.read','projobs.analytics.read');

INSERT INTO "AdminRolePermission" ("roleId", "permissionId")
SELECT 'role_content_manager', id FROM "AdminPermission"
WHERE key IN ('platform.branding.manage','platform.content.manage','procv.branding.manage','procv.templates.manage');

INSERT INTO "AdminRolePermission" ("roleId", "permissionId")
SELECT 'role_analytics_viewer', id FROM "AdminPermission"
WHERE key IN ('analytics.read','procv.analytics.read','projobs.analytics.read');

INSERT INTO "AdminRolePermission" ("roleId", "permissionId")
SELECT 'role_module_admin', id FROM "AdminPermission"
WHERE key IN ('procv.admin.access','procv.analytics.read','procv.audit.read','procv.settings.read','procv.settings.manage',
  'procv.branding.manage','procv.templates.manage','procv.limits.manage','procv.files.manage','procv.exports.manage',
  'projobs.admin.access','projobs.catalog.read','projobs.catalog.moderate','projobs.sources.manage',
  'projobs.alerts.manage','projobs.analytics.read');

-- Migrate the one-way legacy admin marker to an explicit owner assignment.
-- This preserves the existing QA administrator's access while new roles are least-privilege.
INSERT INTO "UserAdminRole" ("id", "userId", "roleId", "assignedById", "createdAt")
SELECT 'legacy_owner_' || md5(u."id"), u."id", 'role_platform_owner', u."id", CURRENT_TIMESTAMP
FROM "User" u
WHERE u."role" = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM "UserAdminRole" a
    WHERE a."userId" = u."id" AND a."roleId" = 'role_platform_owner' AND a."module" IS NULL
  );

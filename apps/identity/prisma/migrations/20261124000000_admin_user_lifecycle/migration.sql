-- Admin user lifecycle: scheduled erasure, owner-only deletion permission and
-- per-module moderator / viewer roles (same scoping model as module_admin).

ALTER TABLE "User" ADD COLUMN "deletionScheduledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deletionRequestedById" TEXT;
CREATE INDEX "User_deletionScheduledAt_idx" ON "User"("deletionScheduledAt");

-- Deleting accounts is irreversible and erases personal data: platform owner only.
INSERT INTO "AdminPermission" ("id", "key", "description") VALUES
('perm_identity_users_delete', 'identity.users.delete', 'Delete accounts and their module data, now or on a scheduled date')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "AdminRolePermission" ("roleId", "permissionId")
SELECT 'role_platform_owner', id FROM "AdminPermission" WHERE key = 'identity.users.delete'
ON CONFLICT DO NOTHING;

-- Module roles: administrator (existing module_admin), moderator and viewer,
-- always assigned with a module scope.
INSERT INTO "AdminRole" ("id", "key", "name", "description", "isSystem", "updatedAt") VALUES
('role_module_moderator', 'module_moderator', 'Module moderator', 'Content and catalog moderation scoped to one assigned module', true, CURRENT_TIMESTAMP),
('role_module_viewer', 'module_viewer', 'Module viewer', 'Read-only metrics and audit scoped to one assigned module', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "AdminRolePermission" ("roleId", "permissionId")
SELECT 'role_module_moderator', id FROM "AdminPermission"
WHERE key IN ('procv.admin.access','procv.analytics.read','procv.audit.read','procv.templates.manage',
  'projobs.admin.access','projobs.catalog.read','projobs.catalog.moderate','projobs.analytics.read')
ON CONFLICT DO NOTHING;

INSERT INTO "AdminRolePermission" ("roleId", "permissionId")
SELECT 'role_module_viewer', id FROM "AdminPermission"
WHERE key IN ('procv.admin.access','procv.analytics.read','procv.audit.read',
  'projobs.admin.access','projobs.catalog.read','projobs.analytics.read')
ON CONFLICT DO NOTHING;

-- CV content access must be a separate, time-bound support workflow, not an ambient admin privilege.
INSERT INTO "AdminPermission" ("id", "key", "description")
VALUES (
  'perm_procv_cvs_support_approve',
  'procv.cvs.support_access.approve',
  'Approve a separately requested, time-limited CV support access grant'
);

-- Even platform owners may approve a support request, but do not receive CV-content access by default.
DELETE FROM "AdminRolePermission"
WHERE "permissionId" = (SELECT id FROM "AdminPermission" WHERE key = 'procv.cvs.support_access');

INSERT INTO "AdminRolePermission" ("roleId", "permissionId")
VALUES ('role_platform_owner', 'perm_procv_cvs_support_approve');

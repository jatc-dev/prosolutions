import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Module } from '@prisma/client';
import prisma from '../../src/prismaClient';
import { assignAdminRole, revokeAdminRole } from '../../src/controllers/adminRolesController';

type Harness = {
  req: any;
  res: any;
  response: { statusCode: number; body?: unknown };
};

function harness(userId: string, body: Record<string, unknown> = {}, assignmentId = ''): Harness {
  const response: { statusCode: number; body?: unknown } = { statusCode: 200 };
  const res = {
    status(code: number) {
      response.statusCode = code;
      return this;
    },
    json(bodyValue: unknown) {
      response.body = bodyValue;
      return this;
    },
    send() {
      return this;
    },
  };
  const req = {
    userId,
    email: 'rbac-test@example.invalid',
    ip: '127.0.0.1',
    params: { assignmentId },
    body,
    get(name: string) {
      return name.toLowerCase() === 'user-agent' ? 'RBAC integration test' : undefined;
    },
  };
  return { req, res, response };
}

async function createUser(label: string) {
  const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return prisma.user.create({
    data: {
      email: `rbac-${label}-${nonce}@example.invalid`,
      name: `RBAC test ${label}`,
      passwordHash: 'not-a-real-password-hash',
    },
  });
}

async function cleanup(userIds: string[], extraRoleId?: string) {
  if (userIds.length) {
    await prisma.auditLog.deleteMany({ where: { adminId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  if (extraRoleId) {
    await prisma.adminRole.deleteMany({ where: { id: extraRoleId } });
  }
}

async function assignBuiltInRole(userId: string, roleKey: string, assignedById: string) {
  const role = await prisma.adminRole.findUniqueOrThrow({ where: { key: roleKey } });
  return prisma.userAdminRole.create({
    data: { userId, roleId: role.id, assignedById },
  });
}

test('serializes concurrent duplicate role assignments into one creation and one conflict', async () => {
  const actor = await createUser('actor');
  const target = await createUser('target');
  try {
    await assignBuiltInRole(actor.id, 'platform_owner', actor.id);
    const role = await prisma.adminRole.findUniqueOrThrow({ where: { key: 'module_admin' } });
    const invoke = () => {
      const h = harness(actor.id, { userId: target.id, roleKey: 'module_admin', module: Module.PROCV });
      return assignAdminRole(h.req, h.res).then(() => h.response.statusCode);
    };

    const statuses = await Promise.all([invoke(), invoke()]);
    assert.deepEqual(statuses.sort((a, b) => a - b), [201, 409]);
    assert.equal(await prisma.userAdminRole.count({
      where: { userId: target.id, roleId: role.id, module: Module.PROCV },
    }), 1);
    assert.equal(await prisma.auditLog.count({
      where: { adminId: actor.id, action: 'admin.role.assigned', resource: 'admin_role_assignment' },
    }), 1);
  } finally {
    await cleanup([actor.id, target.id]);
  }
});

test('concurrent owner revocations never remove the final active platform owner', async () => {
  const actor = await createUser('operator');
  const firstOwner = await createUser('owner-one');
  const secondOwner = await createUser('owner-two');
  let operatorRoleId: string | undefined;
  try {
    const privilegedPermission = await prisma.adminPermission.findUniqueOrThrow({
      where: { key: 'identity.roles.privileged_manage' },
    });
    const operatorRole = await prisma.adminRole.create({
      data: {
        key: `rbac_test_operator_${Date.now()}`,
        name: 'RBAC integration test operator',
        permissions: { create: { permissionId: privilegedPermission.id } },
      },
    });
    operatorRoleId = operatorRole.id;
    await prisma.userAdminRole.create({
      data: { userId: actor.id, roleId: operatorRole.id, assignedById: actor.id },
    });
    const ownerRole = await prisma.adminRole.findUniqueOrThrow({ where: { key: 'platform_owner' } });
    const firstAssignment = await prisma.userAdminRole.create({
      data: { userId: firstOwner.id, roleId: ownerRole.id, assignedById: actor.id },
    });
    const secondAssignment = await prisma.userAdminRole.create({
      data: { userId: secondOwner.id, roleId: ownerRole.id, assignedById: actor.id },
    });

    assert.equal(await prisma.userAdminRole.count({
      where: { roleId: ownerRole.id, module: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    }), 2, 'fixture must begin with exactly two active platform owners');

    const invoke = (assignmentId: string) => {
      const h = harness(actor.id, {}, assignmentId);
      return revokeAdminRole(h.req, h.res).then(() => h.response.statusCode);
    };
    const statuses = await Promise.all([
      invoke(firstAssignment.id),
      invoke(secondAssignment.id),
    ]);

    assert.deepEqual(statuses.sort((a, b) => a - b), [204, 409]);
    assert.equal(await prisma.userAdminRole.count({
      where: { roleId: ownerRole.id, module: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    }), 1, 'exactly one active platform owner must remain');
    assert.equal(await prisma.userAdminRole.count({
      where: { id: { in: [firstAssignment.id, secondAssignment.id] } },
    }), 1);
  } finally {
    await cleanup([actor.id, firstOwner.id, secondOwner.id], operatorRoleId);
  }
});

test('rolls back role assignment and revocation when the audit insert fails', async () => {
  const actor = await createUser('audit-actor');
  const target = await createUser('audit-target');
  let triggerInstalled = false;
  try {
    await assignBuiltInRole(actor.id, 'platform_owner', actor.id);
    const supportRole = await prisma.adminRole.findUniqueOrThrow({ where: { key: 'support_agent' } });

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION rbac_test_reject_admin_audit()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW."resource" = 'admin_role_assignment' THEN
          RAISE EXCEPTION 'intentional RBAC audit failure';
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER rbac_test_reject_admin_audit
      BEFORE INSERT ON "AuditLog"
      FOR EACH ROW EXECUTE FUNCTION rbac_test_reject_admin_audit()
    `);
    triggerInstalled = true;

    const assignRequest = harness(actor.id, { userId: target.id, roleKey: 'support_agent' });
    await assert.rejects(() => assignAdminRole(assignRequest.req, assignRequest.res));
    assert.equal(await prisma.userAdminRole.count({
      where: { userId: target.id, roleId: supportRole.id },
    }), 0, 'failed audit must roll back the role assignment');

    const existingAssignment = await prisma.userAdminRole.create({
      data: { userId: target.id, roleId: supportRole.id, assignedById: actor.id },
    });
    const revokeRequest = harness(actor.id, {}, existingAssignment.id);
    await assert.rejects(() => revokeAdminRole(revokeRequest.req, revokeRequest.res));
    assert.equal(await prisma.userAdminRole.count({
      where: { id: existingAssignment.id },
    }), 1, 'failed audit must roll back the role revocation');
  } finally {
    if (triggerInstalled) {
      await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS rbac_test_reject_admin_audit ON "AuditLog"');
      await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS rbac_test_reject_admin_audit()');
    }
    await cleanup([actor.id, target.id]);
  }
});

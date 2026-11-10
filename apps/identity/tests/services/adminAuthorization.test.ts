import { NextFunction, Response } from 'express';
import { Module } from '@prisma/client';
import { requirePermission, IdentityRequest } from '../../src/middleware/auth';
import { userHasPermission } from '../../src/services/adminAuthorization';

jest.mock('../../src/services/adminAuthorization', () => ({
  userHasPermission: jest.fn(),
}));

const permissionCheck = userHasPermission as jest.MockedFunction<typeof userHasPermission>;

function harness(userId?: string) {
  const req = {
    userId,
    email: 'qa-admin@example.invalid',
    ip: '127.0.0.1',
    headers: { 'user-agent': 'Jest' },
  } as unknown as IdentityRequest;
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, status, json, next };
}

describe('requirePermission', () => {
  beforeEach(() => permissionCheck.mockReset());

  it('rejects unauthenticated requests before checking permissions', async () => {
    const { req, res, status, next } = harness();
    await requirePermission('identity.users.read')(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(permissionCheck).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('denies a user who lacks the requested capability', async () => {
    permissionCheck.mockResolvedValue(false);
    const { req, res, status, json, next } = harness('user-1');
    await requirePermission('procv.cvs.support_access', Module.PROCV)(req, res, next);
    expect(permissionCheck).toHaveBeenCalledWith('user-1', 'procv.cvs.support_access', Module.PROCV);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      message: 'Insufficient permission',
      requiredPermission: 'procv.cvs.support_access',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows only the requested capability in its module scope', async () => {
    permissionCheck.mockResolvedValue(true);
    const { req, res, status, next } = harness('module-admin-1');
    await requirePermission('procv.templates.manage', Module.PROCV)(req, res, next);
    expect(permissionCheck).toHaveBeenCalledWith('module-admin-1', 'procv.templates.manage', Module.PROCV);
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('forwards authorization lookup failures to the error handler', async () => {
    const failure = new Error('database unavailable');
    permissionCheck.mockRejectedValue(failure);
    const { req, res, status, next } = harness('user-1');
    await requirePermission('identity.users.read')(req, res, next);
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(failure);
  });
});

import { Request, Response } from 'express';

// Loose mock function type for Prisma test doubles.
type MockedFn = jest.Mock<any>;

jest.mock('../../src/prismaClient', () => {
  const tx = {
    cV: { findMany: jest.fn(), deleteMany: jest.fn() },
    cVAtsAnalysis: { deleteMany: jest.fn() },
    cVVersion: { deleteMany: jest.fn() },
    session: { deleteMany: jest.fn() },
    emailVerificationToken: { deleteMany: jest.fn() },
    passwordResetToken: { deleteMany: jest.fn() },
    user: { delete: jest.fn() },
  };
  return {
    __esModule: true,
    default: {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      ...tx,
    },
  };
});

jest.mock('../../src/utils/auditLogger', () => ({
  AuditLogger: {
    logUserAction: jest.fn().mockResolvedValue(undefined),
  },
}));

import prismaClient from '../../src/prismaClient';
import { AuditLogger } from '../../src/utils/auditLogger';
import { deleteUser } from '../../src/controllers/adminController';

const db = prismaClient as unknown as {
  $transaction: MockedFn;
  cV: { findMany: MockedFn; deleteMany: MockedFn };
  cVAtsAnalysis: { deleteMany: MockedFn };
  cVVersion: { deleteMany: MockedFn };
  session: { deleteMany: MockedFn };
  emailVerificationToken: { deleteMany: MockedFn };
  passwordResetToken: { deleteMany: MockedFn };
  user: { delete: MockedFn };
};

interface MockResponse {
  statusCode: number;
  body: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
  send(): MockResponse;
}

function mockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
    send() {
      return res;
    },
  };
  return res;
}

function mockRequest(userId: string) {
  return {
    params: { id: 'user-to-delete' },
    user: { id: userId, email: 'admin@example.com' },
  } as unknown as Request;
}

describe('deleteUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.cV.findMany.mockResolvedValue([]);
    db.cVAtsAnalysis.deleteMany.mockResolvedValue({ count: 0 });
    db.cVVersion.deleteMany.mockResolvedValue({ count: 0 });
    db.cV.deleteMany.mockResolvedValue({ count: 0 });
    db.session.deleteMany.mockResolvedValue({ count: 0 });
    db.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
    db.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    db.user.delete.mockResolvedValue({ id: 'user-to-delete' });
  });

  it('deletes sessions and tokens before the user when no CVs exist', async () => {
    const res = mockResponse();

    await deleteUser(mockRequest('admin-1'), res as unknown as Response);

    expect(db.$transaction).toHaveBeenCalled();
    expect(db.cV.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-to-delete' },
      select: { id: true },
    });
    expect(db.cVAtsAnalysis.deleteMany).not.toHaveBeenCalled();
    expect(db.cV.deleteMany).not.toHaveBeenCalled();
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-to-delete' } });
    expect(db.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-to-delete' },
    });
    expect(db.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-to-delete' },
    });
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 'user-to-delete' } });
    expect(res.statusCode).toBe(204);
    expect(AuditLogger.logUserAction).toHaveBeenCalledWith(
      'admin-1',
      'admin@example.com',
      'delete',
      'user-to-delete',
      { deleted: true },
      expect.anything(),
    );
  });

  it('deletes CV dependents deepest-first when the user owns CVs', async () => {
    db.cV.findMany.mockResolvedValue([{ id: 'cv-1' }, { id: 'cv-2' }]);
    const res = mockResponse();

    await deleteUser(mockRequest('admin-1'), res as unknown as Response);

    expect(db.cVAtsAnalysis.deleteMany).toHaveBeenCalledWith({
      where: { cvId: { in: ['cv-1', 'cv-2'] } },
    });
    expect(db.cVVersion.deleteMany).toHaveBeenCalledWith({
      where: { cvId: { in: ['cv-1', 'cv-2'] } },
    });
    expect(db.cV.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-to-delete' } });
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-to-delete' } });
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 'user-to-delete' } });
    expect(res.statusCode).toBe(204);
  });

  it('rejects self-deletion without touching the database', async () => {
    const res = mockResponse();

    await deleteUser(mockRequest('user-to-delete'), res as unknown as Response);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'Cannot delete your own account' });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.user.delete).not.toHaveBeenCalled();
  });

  it('returns 404 when the user does not exist', async () => {
    const notFound = Object.assign(new Error('User not found'), { code: 'P2025' });
    db.user.delete.mockRejectedValue(notFound);
    const res = mockResponse();

    await deleteUser(mockRequest('admin-1'), res as unknown as Response);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: 'User not found' });
  });

  it('returns 409 when a foreign key still blocks the delete', async () => {
    const constraint = Object.assign(new Error('Foreign key constraint failed'), { code: 'P2003' });
    db.user.delete.mockRejectedValue(constraint);
    const res = mockResponse();

    await deleteUser(mockRequest('admin-1'), res as unknown as Response);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({
      message: 'User cannot be deleted because dependent records still reference it',
    });
  });

  it('returns 500 for unexpected errors', async () => {
    db.user.delete.mockRejectedValue(new Error('boom'));
    const res = mockResponse();

    await deleteUser(mockRequest('admin-1'), res as unknown as Response);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: 'Internal server error' });
  });
});

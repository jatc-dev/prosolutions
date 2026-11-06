import { createHmac } from 'crypto';
import prisma from '../src/prismaClient';
import { createDbContext } from '../src/dbContext';

jest.mock('../src/prismaClient', () => ({
  __esModule: true,
  default: { $transaction: jest.fn() },
}));

const mockedPrisma = prisma as unknown as { $transaction: jest.Mock };
const mockedAdminPrisma = { $transaction: jest.fn() };
const { withAdminContext, withPublicContext, withUserContext } = createDbContext(
  mockedPrisma,
  () => mockedAdminPrisma,
);
const TEST_CONTEXT_KEY = 'a'.repeat(64);

function configureTransactionRole(
  client: { $transaction: jest.Mock },
  role = 'procv_app',
  claims: { role: string; sub: string | null } = {
    role: 'user',
    sub: 'identity-user-a',
  },
) {
  const queryRaw = jest
    .fn()
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ current_role: role }])
    .mockResolvedValueOnce([{ claims }]);
  const tx = { $queryRaw: queryRaw };
  client.$transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) =>
    callback(tx),
  );
  return { tx, queryRaw };
}

function capturedContext(queryRaw: jest.Mock) {
  const [template, payload, signature] = queryRaw.mock.calls[1];
  expect(template[0]).toContain("set_config('procv.context_payload',");
  const claims = JSON.parse(payload) as Record<string, unknown>;
  const expected = createHmac('sha256', Buffer.from(TEST_CONTEXT_KEY, 'hex'))
    .update(payload, 'utf8')
    .digest('hex');
  expect(signature).toBe(expected);
  return claims;
}

describe('ProCV signed transaction database context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.$transaction.mockReset();
    mockedAdminPrisma.$transaction.mockReset();
    process.env.PROCV_RLS_CONTEXT_KEY = TEST_CONTEXT_KEY;
  });

  it('sets the restricted role and signed user context inside one transaction', async () => {
    const { queryRaw } = configureTransactionRole(mockedPrisma);
    const operation = jest.fn().mockResolvedValue('ok');

    await expect(withUserContext('identity-user-a', operation)).resolves.toBe('ok');

    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(queryRaw).toHaveBeenCalledTimes(4);
    expect(queryRaw.mock.calls[0][0][0]).toContain("set_config('role', ");
    expect(queryRaw.mock.calls[0][1]).toBe('procv_app');
    expect(queryRaw.mock.calls[1][0].join('')).toContain("set_config('procv.context_signature'");
    const claims = capturedContext(queryRaw);
    expect(claims).toMatchObject({
      iss: 'procv-backend',
      aud: 'procv-rls',
      role: 'user',
      sub: 'identity-user-a',
      kid: 'v1',
    });
    expect(claims.exp as number).toBeGreaterThan(claims.iat as number);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('signs an explicit administrator context without a caller-controlled GUC flag', async () => {
    const { queryRaw } = configureTransactionRole(mockedAdminPrisma, 'procv_admin_app', {
      role: 'user',
      sub: 'identity-admin',
    });
    await withAdminContext('identity-admin', async () => 'admin');
    expect(capturedContext(queryRaw)).toMatchObject({ role: 'user', sub: 'identity-admin' });
    expect(queryRaw.mock.calls[0][1]).toBe('procv_admin_app');
    expect(mockedAdminPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
    expect(queryRaw.mock.calls[1][0].join('')).not.toContain('procv.is_admin');
  });

  it('signs a public context with no subject', async () => {
    const { queryRaw } = configureTransactionRole(mockedPrisma, 'procv_app', {
      role: 'public',
      sub: null,
    });
    await withPublicContext(async () => 'public');
    expect(capturedContext(queryRaw)).toMatchObject({ role: 'public', sub: null });
  });

  it('rejects an empty authenticated subject before opening a transaction', async () => {
    await expect(withUserContext('  ', async () => 'nope')).rejects.toThrow(
      'A non-empty ProIdentity user ID is required',
    );
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('fails closed when the signing key is absent', async () => {
    delete process.env.PROCV_RLS_CONTEXT_KEY;
    await expect(withUserContext('identity-user-a', async () => 'nope')).rejects.toThrow(
      'PROCV_RLS_CONTEXT_KEY must be configured',
    );
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('fails closed when no isolated administrative connection is configured', async () => {
    const context = createDbContext(mockedPrisma);
    await expect(context.withAdminContext('identity-admin', async () => 'nope')).rejects.toThrow(
      'administrative database credentials are not configured',
    );
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('fails closed if the restricted database role cannot be assumed', async () => {
    const { queryRaw } = configureTransactionRole(mockedPrisma, 'procv_login');
    await expect(withUserContext('identity-user-a', async () => 'nope')).rejects.toThrow(
      'Unable to assume the restricted procv_app database role',
    );
    expect(queryRaw).toHaveBeenCalledTimes(3);
  });

  it('fails closed when PostgreSQL rejects the signed context', async () => {
    const { queryRaw } = configureTransactionRole(mockedPrisma, 'procv_app', {
      role: 'user',
      sub: 'different-user',
    });
    const operation = jest.fn();

    await expect(withUserContext('identity-user-a', operation)).rejects.toThrow(
      'PROCV_RLS_CONTEXT_KEY matches the v1 database verifier key',
    );
    expect(operation).not.toHaveBeenCalled();
    expect(queryRaw).toHaveBeenCalledTimes(4);
  });
});

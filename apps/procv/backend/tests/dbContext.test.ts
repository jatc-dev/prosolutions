import prisma from '../src/prismaClient';
import { withAdminContext, withPublicContext, withUserContext } from '../src/dbContext';

jest.mock('../src/prismaClient', () => ({
  __esModule: true,
  default: { $transaction: jest.fn() },
}));

const mockedPrisma = prisma as unknown as {
  $transaction: jest.Mock;
};

function configureTransactionRole() {
  const queryRaw = jest
    .fn()
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ current_role: 'procv_app' }])
    .mockResolvedValueOnce([]);
  const tx = { $queryRaw };
  mockedPrisma.$transaction.mockImplementation(
    async (callback: (client: typeof tx) => unknown) => callback(tx),
  );
  return { tx, queryRaw };
}

describe('ProCV transaction database context', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets the restricted role and authenticated user in one transaction', async () => {
    const { queryRaw } = configureTransactionRole();
    const operation = jest.fn().mockResolvedValue('ok');

    await expect(withUserContext('identity-user-a', operation)).resolves.toBe('ok');

    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(queryRaw).toHaveBeenCalledTimes(3);
    expect(queryRaw.mock.calls[0][0][0]).toContain("set_config('role', 'procv_app', true)");
    expect(queryRaw.mock.calls[2][0][0]).toContain("set_config('procv.user_id'");
    expect(queryRaw.mock.calls[2][1]).toBe('identity-user-a');
    expect(queryRaw.mock.calls[2][2]).toBe('false');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('sets the admin flag only in the admin context helper', async () => {
    const { queryRaw } = configureTransactionRole();

    await withAdminContext('identity-admin', async () => 'admin');

    expect(queryRaw.mock.calls[2][1]).toBe('identity-admin');
    expect(queryRaw.mock.calls[2][2]).toBe('true');
  });

  it('leaves the user context empty for public reads', async () => {
    const { queryRaw } = configureTransactionRole();

    await withPublicContext(async () => 'public');

    expect(queryRaw.mock.calls[2][1]).toBe('');
    expect(queryRaw.mock.calls[2][2]).toBe('false');
  });

  it('rejects an empty authenticated subject before opening a transaction', async () => {
    await expect(withUserContext('  ', async () => 'nope')).rejects.toThrow(
      'A non-empty ProIdentity user ID is required',
    );
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('fails closed if the restricted database role cannot be assumed', async () => {
    const queryRaw = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ current_role: 'procv_login' }]);
    mockedPrisma.$transaction.mockImplementation(
      async (callback: (client: { $queryRaw: typeof queryRaw }) => unknown) =>
        callback({ $queryRaw }),
    );

    await expect(withUserContext('identity-user-a', async () => 'nope')).rejects.toThrow(
      'Unable to assume the restricted procv_app database role',
    );
    expect(queryRaw).toHaveBeenCalledTimes(2);
  });
});
